import datastore from '../../services/datastore.js';
// Use chainctl client - it works when authenticated locally
import chainguardClient from '../../services/chainguard-chainctl.js';
// import chainguardClient from '../../services/chainguard.js';
import config from '../../config/index.js';
import buildMonitor from '../../services/build-monitor.js';

export default function registerApprovalActions(app) {
  // Handle approve button click
  app.action('approve_request', async ({ action, ack, body, client }) => {
    await ack();

    const requestId = action.value;
    const approver = body.user;
    const request = datastore.getRequest(requestId);

    if (!request) {
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: approver.id,
        text: ':warning: Request not found. It may have already been processed.'
      });
      return;
    }

    if (request.status !== 'pending') {
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: approver.id,
        text: `:warning: This request has already been ${request.status}.`
      });
      return;
    }

    // Update request status
    datastore.updateRequest(requestId, {
      status: 'approved',
      approverId: approver.id,
      approverName: approver.username,
      approvedAt: new Date().toISOString()
    });

    // Update the original message
    const updatedBlocks = body.message.blocks.slice(0, -1); // Remove action buttons
    updatedBlocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `:white_check_mark: Approved by <@${approver.id}> on ${new Date().toLocaleString()}`
        }
      ]
    });

    await client.chat.update({
      channel: body.channel.id,
      ts: body.message.ts,
      text: `Request ${requestId} approved by <@${approver.id}>`,
      blocks: updatedBlocks
    });

    // Notify requester
    await client.chat.postMessage({
      channel: request.requesterId,
      text: `Your image request has been approved!`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:white_check_mark: *Your image request has been approved!*\n\nRequest ID: \`${requestId}\`\nApproved by: <@${approver.id}>\nBase Repo: \`${request.imageName}\``
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '_Applying build configuration..._'
          }
        }
      ]
    });

    // Trigger Chainguard API to create the image
    try {
      datastore.updateRequest(requestId, { status: 'checking' });

      // First, check if an existing custom image already has these packages
      const matchingImages = await chainguardClient.findMatchingCustomImages(
        request.imageName,
        request.packages
      );

      if (matchingImages.success && matchingImages.matches.length > 0) {
        // Found existing images with the same packages
        const exactMatches = matchingImages.matches.filter(m => m.exactMatch);
        const match = exactMatches.length > 0 ? exactMatches[0] : matchingImages.matches[0];

        datastore.updateRequest(requestId, {
          status: 'existing_image_found',
          existingImage: match.repoName,
          imageUrl: `${config.chainguard.registry}/${match.repoName}:latest`
        });

        // Notify requester about existing image
        await client.chat.postMessage({
          channel: request.requesterId,
          text: `An existing custom image already has your requested packages!`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `:recycle: *Existing Image Found!*\n\nRequest ID: \`${requestId}\`\n\nGood news! We found an existing custom image that already includes all your requested packages:`
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Existing Image:* \`${match.repoName}\`\n*Packages:* ${match.packages.map(p => `\`${p}\``).join(', ')}\n*Match Type:* ${match.exactMatch ? 'Exact match' : 'Has all your packages plus more'}`
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Use this image:*\n\`\`\`docker pull ${config.chainguard.registry}/${match.repoName}:latest\`\`\`\n\n_This saves resources and avoids duplicate custom images!_`
              }
            }
          ]
        });

        // Notify approver
        await client.chat.postMessage({
          channel: approver.id,
          text: `Existing image found for request ${requestId}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `:recycle: *Existing Image Suggested*\n\nRequest ID: \`${requestId}\`\nExisting Image: \`${match.repoName}\`\nRequester: <@${request.requesterId}>\n\nNo new image was created as an existing one already has the requested packages.`
              }
            }
          ]
        });

        return; // Don't create a new image
      }

      // No existing match found, proceed with creating new custom image
      datastore.updateRequest(requestId, { status: 'building' });

      const result = await chainguardClient.createCustomAssembly({
        name: request.imageName,
        requestName: request.requestName,
        baseImage: request.baseImage,
        packages: request.packages,
        description: request.description
      });

      if (result.success) {
        const imageUrl = result.data.image_url || `${config.chainguard.registry}/${request.imageName}`;
        const customName = result.data.custom_name;

        // Parse chainctl output to show what actually happened
        const stdout = result.data.stdout || '';
        const wasCreated = stdout.includes('Applying build config') || stdout.includes('Creating new repo');
        const noChanges = stdout.includes('No changes detected');

        datastore.updateRequest(requestId, {
          status: wasCreated ? 'completed' : 'no_changes',
          assemblyId: result.data.id,
          imageUrl: imageUrl,
          completedAt: new Date().toISOString(),
          chainctlOutput: stdout
        });

        // Notify requester of completion
        const statusEmoji = wasCreated ? ':tada:' : ':information_source:';
        const statusText = wasCreated
          ? '*New Custom Image Created!*'
          : noChanges
            ? '*Configuration Already Up-to-Date*'
            : '*Configuration Applied*';

        const messageBlocks = [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${statusEmoji} ${statusText}\n\nRequest ID: \`${requestId}\`\n${customName ? `Custom Image Name: \`${customName}\`` : `Base Repo: \`${request.imageName}\``}\nPackages: ${request.packages.length > 0 ? request.packages.map(p => `\`${p}\``).join(', ') : 'None'}`
            }
          }
        ];

        if (noChanges) {
          messageBlocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:white_check_mark: No changes were needed - the configuration you requested is already applied to this image.`
            }
          });
        } else if (wasCreated) {
          messageBlocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:information_source: *What's Next:*\nYour custom image will be built on Chainguard's schedule (typically within a few hours).\n\n*Image URL:*\n\`${imageUrl}\`\n\n*Pull Command:*\n\`\`\`docker pull ${imageUrl}\`\`\``
            }
          });
        }

        // Show chainctl output for transparency
        if (stdout && stdout.length < 500) {
          messageBlocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Chainguard Response:*\n\`\`\`${stdout.substring(0, 500)}\`\`\``
            }
          });
        }

        await client.chat.postMessage({
          channel: request.requesterId,
          text: `Your custom image request has been processed!`,
          blocks: messageBlocks
        });

        // Start monitoring for build completion if a new image was created
        if (wasCreated && customName) {
          console.log(`Starting build monitoring for ${customName}`);
          buildMonitor.startMonitoring(requestId, customName, async (completedRequest, build) => {
            // Notify requester when build completes
            await client.chat.postMessage({
              channel: completedRequest.requesterId,
              text: `Your custom image is ready!`,
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `:tada: *Your Custom Image is Ready!*\n\nRequest ID: \`${requestId}\`\nCustom Image: \`${customName}\`\n\nYour image has been built and is now available to pull!`
                  }
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*Pull your image:*\n\`\`\`docker pull ${imageUrl}\`\`\`\n\n*Build completed:* ${new Date(build.completionTime).toLocaleString()}`
                  }
                }
              ]
            });

            // Also notify approver
            await client.chat.postMessage({
              channel: approver.id,
              text: `Build completed for request ${requestId}`,
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `:white_check_mark: *Build Complete*\n\nRequest ID: \`${requestId}\`\nCustom Image: \`${customName}\`\nRequester: <@${completedRequest.requesterId}>\n\nImage is now available at: \`${imageUrl}\``
                  }
                }
              ]
            });
          });
        }

        // Notify approver
        await client.chat.postMessage({
          channel: approver.id,
          text: `Build configuration applied for request ${requestId}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `:white_check_mark: Build configuration applied successfully\n\nRequest ID: \`${requestId}\`\nBase Repo: \`${request.imageName}\`\nCustomizations: ${request.packages.length > 0 ? request.packages.map(p => `\`${p}\``).join(', ') : 'None'}\nRequester: <@${request.requesterId}>\n\n_Note: The actual image build will complete on Chainguard's schedule._`
              }
            }
          ]
        });
      } else {
        datastore.updateRequest(requestId, {
          status: 'failed',
          error: result.error
        });

        // Notify requester of failure
        await client.chat.postMessage({
          channel: request.requesterId,
          text: `Failed to build your custom image.`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `:warning: *Failed to build your custom image*\n\nRequest ID: \`${requestId}\`\nError: ${result.error}\n\nPlease contact your administrator for assistance.`
              }
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error creating custom assembly:', error);
      datastore.updateRequest(requestId, {
        status: 'failed',
        error: error.message
      });
    }
  });

  // Handle reject button click
  app.action('reject_request', async ({ action, ack, body, client }) => {
    await ack();

    const requestId = action.value;
    const approver = body.user;
    const request = datastore.getRequest(requestId);

    if (!request) {
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: approver.id,
        text: ':warning: Request not found. It may have already been processed.'
      });
      return;
    }

    if (request.status !== 'pending') {
      await client.chat.postEphemeral({
        channel: body.channel.id,
        user: approver.id,
        text: `:warning: This request has already been ${request.status}.`
      });
      return;
    }

    // Open a modal to collect rejection reason
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'rejection_reason_modal',
        private_metadata: JSON.stringify({
          requestId,
          messageTs: body.message.ts,
          channelId: body.channel.id
        }),
        title: {
          type: 'plain_text',
          text: 'Reject Request'
        },
        submit: {
          type: 'plain_text',
          text: 'Reject'
        },
        close: {
          type: 'plain_text',
          text: 'Cancel'
        },
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `You are about to reject the request for *${request.imageName}*`
            }
          },
          {
            type: 'input',
            block_id: 'rejection_reason',
            label: {
              type: 'plain_text',
              text: 'Reason for Rejection'
            },
            element: {
              type: 'plain_text_input',
              action_id: 'reason_input',
              multiline: true,
              placeholder: {
                type: 'plain_text',
                text: 'Provide a reason for rejecting this request...'
              }
            }
          }
        ]
      }
    });
  });

  // Handle rejection reason modal submission
  app.view('rejection_reason_modal', async ({ ack, body, view, client }) => {
    await ack();

    const metadata = JSON.parse(view.private_metadata);
    const { requestId, messageTs, channelId } = metadata;
    const reason = view.state.values.rejection_reason.reason_input.value;
    const approver = body.user;

    const request = datastore.getRequest(requestId);

    // Update request status
    datastore.updateRequest(requestId, {
      status: 'rejected',
      rejectedBy: approver.id,
      rejectedByName: approver.username,
      rejectionReason: reason,
      rejectedAt: new Date().toISOString()
    });

    // Update the original message
    const updatedBlocks = body.message?.blocks?.slice(0, -1) || [];
    updatedBlocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `:x: Rejected by <@${approver.id}> on ${new Date().toLocaleString()}\nReason: ${reason}`
        }
      ]
    });

    try {
      await client.chat.update({
        channel: channelId,
        ts: messageTs,
        text: `Request ${requestId} rejected by <@${approver.id}>`,
        blocks: updatedBlocks
      });
    } catch (error) {
      console.error('Error updating message:', error);
    }

    // Notify requester
    await client.chat.postMessage({
      channel: request.requesterId,
      text: `Your image request has been rejected.`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:x: *Your image request has been rejected*\n\nRequest ID: \`${requestId}\`\nRejected by: <@${approver.id}>\nImage Name: ${request.imageName}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Reason:*\n${reason}`
          }
        }
      ]
    });
  });
}
