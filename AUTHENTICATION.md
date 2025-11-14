# Chainguard Authentication for the Slack App

## Current Status

**Update**: The app is now configured to use the Chainguard API directly instead of chainctl. The user JWT token in your `.env` file should work with the API. We're testing to find the correct API endpoints.

## Previous Issue (Resolved)

The Slack app initially tried to use Chainguard's chainctl CLI, which requires assumable identity tokens for non-interactive use. However, we've switched to using the Chainguard API directly, which accepts user JWT tokens.

## Solution: Create an Assumable Identity

For production use, you need to create a **Chainguard Assumable Identity** (service account) that can be used for non-interactive authentication.

### Steps to Create an Assumable Identity

1. **Create the Identity using chainctl:**

```bash
chainctl iam identities create \
  --name="slack-app-service-account" \
  --description="Service account for Slack app to create custom images" \
  --parent=<YOUR_ORG_ID>
```

2. **Bind the Identity to appropriate roles:**

```bash
chainctl iam role-bindings create \
  --identity=<IDENTITY_ID> \
  --role=<ROLE_ID> \
  --group=<YOUR_ORG_ID>
```

Required roles:
- `images.repos.build.creator` - To create custom image builds
- `images.repos.reader` - To read image repository information

3. **Generate the Identity Token:**

The identity will have an issuer URL and subject that can be used to generate tokens. You'll need to configure your identity provider (e.g., GitHub Actions, GitLab CI, or custom OIDC) to issue tokens for this identity.

### Alternative: Use the Chainguard Console

1. Navigate to https://console.chainguard.dev
2. Go to your organization settings
3. Click on "Identities" or "Service Accounts"
4. Create a new identity with appropriate permissions
5. Download or copy the identity configuration

### Update the Application

Once you have the assumable identity token, update your `.env` file:

```bash
# Replace this with your assumable identity token
CHAINGUARD_API_TOKEN=<YOUR_ASSUMABLE_IDENTITY_TOKEN>
```

### For Development/Testing

If you want to test locally without creating an assumable identity:

1. Run `chainctl auth login` on your local machine
2. Copy the token from `~/.config/chainctl/token`
3. Use docker-compose to mount your local chainctl config:

```yaml
volumes:
  - ~/.config/chainctl:/home/node/.config/chainctl:ro
```

This is already configured in the `docker-compose.yml` file.

## References

- [Chainguard Assumable Identities Documentation](https://edu.chainguard.dev/chainguard/administration/assumable-ids/)
- [chainctl iam identities create](https://edu.chainguard.dev/chainguard/chainctl/chainctl-docs/chainctl_iam_identities_create/)
- [Get Started with chainctl](https://edu.chainguard.dev/chainguard/chainctl-usage/getting-started-with-chainctl/)

## Current Workaround

The docker-compose.yml is configured to mount your local `~/.config/chainctl` directory. If you've authenticated chainctl on your host machine, the container will use those credentials.

To authenticate on your host:

```bash
chainctl auth login
```

Then restart the Docker container:

```bash
docker compose down && docker compose up -d
```
