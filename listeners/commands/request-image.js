export default function registerRequestImageCommand(app) {
  app.command('/request-image', async ({ command, ack, client }) => {
    await ack();

    try {
      // Open the same modal as the shortcut
      await client.views.open({
        trigger_id: command.trigger_id,
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
              block_id: 'image_name',
              label: {
                type: 'plain_text',
                text: 'Image Name'
              },
              element: {
                type: 'plain_text_input',
                action_id: 'name_input',
                placeholder: {
                  type: 'plain_text',
                  text: 'e.g., my-custom-python-app'
                },
                initial_value: command.text || ''
              }
            },
            {
              type: 'input',
              block_id: 'base_image',
              label: {
                type: 'plain_text',
                text: 'Base Image'
              },
              element: {
                type: 'plain_text_input',
                action_id: 'base_input',
                placeholder: {
                  type: 'plain_text',
                  text: 'e.g., cgr.dev/chainguard/python:latest'
                }
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
}
