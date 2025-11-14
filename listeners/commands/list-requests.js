import datastore from '../../services/datastore.js';

export default function registerListRequestsCommand(app) {
  app.command('/list-requests', async ({ command, ack, say, client }) => {
    await ack();

    const statusFilter = command.text.trim().toLowerCase() || 'all';
    const userId = command.user_id;

    let requests;
    if (statusFilter === 'all' || statusFilter === '') {
      requests = datastore.getRequestsByUser(userId);
    } else {
      requests = datastore.getRequestsByUser(userId).filter(
        req => req.status === statusFilter
      );
    }

    if (requests.length === 0) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: userId,
        text: `No requests found${statusFilter !== 'all' && statusFilter !== '' ? ` with status "${statusFilter}"` : ''}.`
      });
      return;
    }

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:clipboard: *Your Image Requests*${statusFilter !== 'all' && statusFilter !== '' ? ` (Status: ${statusFilter})` : ''}`
        }
      },
      {
        type: 'divider'
      }
    ];

    for (const request of requests) {
      const statusEmoji = {
        pending: ':hourglass:',
        approved: ':white_check_mark:',
        rejected: ':x:',
        building: ':hammer_and_wrench:',
        completed: ':tada:',
        failed: ':warning:'
      }[request.status] || ':question:';

      blocks.push(
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Request ID:*\n\`${request.id}\``
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\n${statusEmoji} ${request.status}`
            },
            {
              type: 'mrkdwn',
              text: `*Image Name:*\n${request.imageName}`
            },
            {
              type: 'mrkdwn',
              text: `*Created:*\n${new Date(request.createdAt).toLocaleString()}`
            }
          ]
        },
        {
          type: 'divider'
        }
      );
    }

    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: userId,
      text: 'Your image requests',
      blocks
    });
  });
}
