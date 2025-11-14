import datastore from '../../services/datastore.js';
import config from '../../config/index.js';

export default function registerRequestImageShortcut(app) {
  // Handle the global shortcut
  app.shortcut('request_image_shortcut', async ({ shortcut, ack, client }) => {
    await ack();

    try {
      // Open a modal with the image request form
      await client.views.open({
        trigger_id: shortcut.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'image_request_modal',
          title: {
            type: 'plain_text',
            text: 'Request Custom Image'
          },
          submit: {
            type: 'plain_text',
            text: 'Submit'
          },
          close: {
            type: 'plain_text',
            text: 'Cancel'
          },
          blocks: [
            {
              type: 'input',
              block_id: 'request_name',
              label: {
                type: 'plain_text',
                text: 'Request Name'
              },
              element: {
                type: 'plain_text_input',
                action_id: 'name_input',
                placeholder: {
                  type: 'plain_text',
                  text: 'e.g., Python with ML libraries'
                }
              },
              hint: {
                type: 'plain_text',
                text: 'Descriptive name for this customization'
              }
            },
            {
              type: 'input',
              block_id: 'base_repo',
              label: {
                type: 'plain_text',
                text: 'Base Image Repo'
              },
              element: {
                type: 'static_select',
                action_id: 'repo_select',
                placeholder: {
                  type: 'plain_text',
                  text: 'Select a base image'
                },
                options: [
                  {
                    text: { type: 'plain_text', text: 'Node.js' },
                    value: 'node'
                  },
                  {
                    text: { type: 'plain_text', text: 'Python' },
                    value: 'python'
                  },
                  {
                    text: { type: 'plain_text', text: 'Go' },
                    value: 'go'
                  },
                  {
                    text: { type: 'plain_text', text: 'Java JDK' },
                    value: 'jdk'
                  },
                  {
                    text: { type: 'plain_text', text: 'Java JRE' },
                    value: 'jre'
                  },
                  {
                    text: { type: 'plain_text', text: 'Ruby' },
                    value: 'ruby'
                  },
                  {
                    text: { type: 'plain_text', text: 'PHP' },
                    value: 'php'
                  },
                  {
                    text: { type: 'plain_text', text: 'Bash' },
                    value: 'bash'
                  }
                ]
              },
              hint: {
                type: 'plain_text',
                text: 'The customization will be applied to this existing repo'
              }
            },
            {
              type: 'input',
              block_id: 'packages',
              label: {
                type: 'plain_text',
                text: 'Additional Packages'
              },
              element: {
                type: 'plain_text_input',
                action_id: 'packages_input',
                multiline: true,
                placeholder: {
                  type: 'plain_text',
                  text: 'Enter package names, one per line'
                }
              },
              optional: true
            },
            {
              type: 'input',
              block_id: 'description',
              label: {
                type: 'plain_text',
                text: 'Description'
              },
              element: {
                type: 'plain_text_input',
                action_id: 'description_input',
                multiline: true,
                placeholder: {
                  type: 'plain_text',
                  text: 'Describe the purpose of this custom image'
                }
              }
            },
            {
              type: 'input',
              block_id: 'justification',
              label: {
                type: 'plain_text',
                text: 'Business Justification'
              },
              element: {
                type: 'plain_text_input',
                action_id: 'justification_input',
                multiline: true,
                placeholder: {
                  type: 'plain_text',
                  text: 'Why is this custom image needed?'
                }
              }
            }
          ]
        }
      });
    } catch (error) {
      console.error('Error opening modal:', error);
    }
  });

  // Handle the modal submission
  app.view('image_request_modal', async ({ ack, body, view, client }) => {
    console.log('Modal submission received!');
    await ack();

    const values = view.state.values;
    const requestName = values.request_name.name_input.value;
    const baseRepo = values.base_repo.repo_select.selected_option.value;
    const baseImage = `${config.chainguard.registry}/${baseRepo}:latest`;
    const packagesText = values.packages.packages_input.value || '';
    const packages = packagesText.split('\n').filter(p => p.trim());
    const description = values.description.description_input.value;
    const justification = values.justification.justification_input.value;

    const requester = body.user;

    // Store the request
    const request = datastore.createRequest({
      imageName: baseRepo,  // This is the repo name for chainctl
      requestName: requestName,  // This is the descriptive name
      baseImage,
      packages,
      description,
      justification,
      requesterId: requester.id,
      requesterName: requester.username
    });

    try {
      // Send confirmation to requester
      await client.chat.postMessage({
        channel: requester.id,
        text: `Your image request has been submitted! Request ID: ${request.id}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:white_check_mark: *Your image request has been submitted!*\n\nRequest ID: \`${request.id}\``
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Request Name:*\n${requestName}`
              },
              {
                type: 'mrkdwn',
                text: `*Base Repo:*\n${baseRepo}`
              },
              {
                type: 'mrkdwn',
                text: `*Status:*\n${request.status}`
              }
            ]
          }
        ]
      });

      // Send approval request to approvers
      const approverIds = config.app.approverUserIds;

      for (const approverId of approverIds) {
        await client.chat.postMessage({
          channel: approverId.trim(),
          text: `New image request from <@${requester.id}>`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `:inbox_tray: *New Custom Image Request*\n\nFrom: <@${requester.id}>\nRequest ID: \`${request.id}\``
              }
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Request Name:*\n${requestName}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Base Repo:*\n${baseRepo}`
                }
              ]
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Description:*\n${description}`
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Justification:*\n${justification}`
              }
            },
            ...(packages.length > 0 ? [{
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Additional Packages:*\n${packages.map(p => `• ${p}`).join('\n')}`
              }
            }] : []),
            {
              type: 'actions',
              block_id: 'approval_actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'Approve'
                  },
                  style: 'primary',
                  action_id: 'approve_request',
                  value: request.id
                },
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'Reject'
                  },
                  style: 'danger',
                  action_id: 'reject_request',
                  value: request.id
                }
              ]
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error sending messages:', error);
    }
  });
}
