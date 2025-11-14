# Chainguard Slack App - Key Findings and Solution

## Summary

Successfully created a Slack app for requesting and approving Chainguard custom images. Discovered the correct workflow for Chainguard Custom Assembly and identified authentication requirements.

## Key Discoveries

### 1. Correct Build YAML Format

**CRITICAL**: The build YAML format is NOT the same as Kubernetes-style YAML. The correct format is:

```yaml
contents:
  packages:
    - python-3.14
    - wget
```

**INCORRECT format** (Kubernetes-style):
```yaml
apiVersion: v1
kind: Build
metadata:
  name: test-custom-node
spec:
  baseImage: cgr.dev/demo.com/node:latest
  packages:
    - python-3.14
```

Key differences:
- **No `apiVersion`, `kind`, `metadata`, or `spec` fields**
- **No `baseImage` field** - customizations apply to the entire repo, not specific tags
- Structure is simply `contents:` > `packages:` list
- Indentation is 2 spaces for packages under contents

### 2. Chainguard Custom Assembly Workflow

**Important**: You cannot create brand new image repositories. Custom Assembly works by applying build configurations to **existing repos** in your organization.

#### Correct Workflow:
1. List existing repos: `chainctl images repos list --parent <ORG_ID>`
2. Create a build YAML with desired packages
3. Apply build to an **existing repo**: `chainctl images repos build apply -f build.yaml --parent <ORG_ID> --repo node --yes`

#### Example:
```bash
# This WORKS - applies to existing "node" repo
chainctl images repos build apply -f build.yaml --parent aaaa1111bbbb2222cccc3333dddd4444eeee5555 --repo node --yes

# This FAILS - "custom-node" doesn't exist
chainctl images repos build apply -f build.yaml --parent aaaa1111bbbb2222cccc3333dddd4444eeee5555 --repo custom-node --yes
```

### 2. Registry URL Format

**Always**: `cgr.dev/<CUSTOMER_ORG>/`

Example:
- Your org: `cgr.dev/demo.com/`
- Customer org: `cgr.dev/<customer_org>/`

### 3. Authentication Challenges

#### What We Tried:
1. **Chainguard API** - All endpoints returned "Not Found" (may not be publicly available)
2. **chainctl with user JWT** - Doesn't work; chainctl needs assumable identity for non-interactive use
3. **Environment variables** - `CHAINCTL_TOKEN` env var doesn't work
4. **Token file** - Writing JWT to `~/.config/chainctl/token` doesn't work

#### What Works:
- **Local chainctl auth**: Running `chainctl auth login` on host machine works perfectly
- **Docker volume mount**: Mounting `~/.config/chainctl` works IF you have local authentication

#### Production Solution Needed:
Create a Chainguard Assumable Identity (service account):

```bash
# 1. Create identity
chainctl iam identities create \\
  --name="slack-app-service-account" \\
  --description="Service account for Slack app" \\
  --parent=<ORG_ID>

# 2. Bind roles
chainctl iam role-bindings create \\
  --identity=<IDENTITY_ID> \\
  --role=images.repos.build.creator \\
  --group=<ORG_ID>

# 3. Get identity token for use in app
```

## Current App Status

### ✅ What Works:
- Slack integration (Socket Mode)
- Request submission modal
- Approval/rejection workflow
- In-memory request tracking
- Docker deployment on Chainguard images
- chainctl CLI integration (when authenticated locally)

### ⚠️ What Needs Work:
- **Authentication**: Need assumable identity for production
- **Repo selection**: Should list available repos instead of free-text "image name"
- **API integration**: Custom Assembly API may not be publicly available

## Recommended Updates

### 1. Update Slack Modal

Change from "Image Name" (free text) to "Base Image Repo" (dropdown):

```javascript
{
  type: 'static_select',
  placeholder: { type: 'plain_text', text: 'Select base image' },
  options: [
    { text: { type: 'plain_text', text: 'Node.js' }, value: 'node' },
    { text: { type: 'plain_text', text: 'Python' }, value: 'python' },
    { text: { type: 'plain_text', text: 'Go' }, value: 'go' },
    { text: { type: 'plain_text', text: 'Java JDK' }, value: 'jdk' },
    { text: { type: 'plain_text', text: 'Ruby' }, value: 'ruby' }
  ]
}
```

### 2. Dynamic Repo Discovery

Fetch available repos on startup:

```javascript
async function loadAvailableRepos() {
  const result = await execAsync(`chainctl images repos list --parent ${orgId} -o json`);
  return JSON.parse(result.stdout);
}
```

### 3. Production Deployment Checklist

- [ ] Create Chainguard assumable identity
- [ ] Update authentication to use identity token
- [ ] Test full workflow in Docker
- [ ] Document customer setup process
- [ ] Add error handling for missing repos
- [ ] Implement persistent datastore (optional)

## Files Created/Modified

### New Files:
- `AUTHENTICATION.md` - Detailed auth documentation
- `FINDINGS.md` - This file
- `test-build.yaml` - Example build configuration

### Modified Files:
- `listeners/events/approval-actions.js` - Switched between API and chainctl clients
- `docker-compose.yml` - Added CHAINCTL_TOKEN environment variable
- `.env` - Added CHAINGUARD_API_TOKEN

### Key Files:
- `services/chainguard-chainctl.js` - chainctl CLI integration
- `services/chainguard.js` - API client (not working)
- `Dockerfile` - Multi-stage build with chainctl
- `docker-compose.yml` - Volume mount for chainctl config

## Testing Results

### Successful Local Test:
```bash
$ chainctl images repos build apply -f test-build.yaml --parent aaaa1111bbbb2222cccc3333dddd4444eeee5555 --repo node --yes

Applying build config to node
  (*v1.CustomOverlay)(Inverse(protocmp.Transform, protocmp.Message{
    "@type": s"chainguard.platform.registry.CustomOverlay",
    "contents": protocmp.Message{
      "@type":    s"chainguard.platform.registry.ImageContents",
-     "packages": []string{"python-3.13"},
    },
  }))
```

### Failed API Tests:
All endpoints returned `{ code: 5, message: 'Not Found', details: [] }`:
- `/iam/organizations/<ORG_ID>/custom-assemblies`
- `/registry/custom-assemblies`
- `/v1/custom-assemblies`
- `/assembly`

## Next Steps

1. **Immediate**: Document for customer that they need to create assumable identity
2. **Short-term**: Update modal to use dropdown for repo selection
3. **Medium-term**: Add dynamic repo discovery
4. **Long-term**: Implement persistent storage for requests

## Customer Deployment Instructions

### Prerequisites:
1. Slack workspace with admin access
2. Chainguard organization
3. chainctl installed

### Setup Steps:

1. **Create Slack App**:
   - Upload `manifest.json`
   - Get Bot Token, Signing Secret, App Token

2. **Create Assumable Identity**:
   ```bash
   chainctl iam identities create --name="slack-app" --parent=<ORG_ID>
   chainctl iam role-bindings create --identity=<ID> --role=images.repos.build.creator --group=<ORG_ID>
   ```

3. **Configure Environment**:
   - Copy `.env.example` to `.env`
   - Fill in Slack and Chainguard credentials
   - Set `CHAINGUARD_REGISTRY=cgr.dev/<customer_org>/`

4. **Deploy**:
   ```bash
   docker compose up -d
   ```

## Known Limitations

1. **Authentication**: Requires assumable identity for production
2. **API Availability**: Custom Assembly API may not be publicly accessible
3. **Repo Creation**: Cannot create new repos, only customize existing ones
4. **Token Storage**: chainctl uses OS-specific keychain, difficult to replicate in Docker
5. **In-Memory Storage**: Requests are lost on restart (easily fixable with DB)

## Resources

- [Chainguard Custom Assembly Docs](https://edu.chainguard.dev/chainguard/chainguard-images/features/ca-docs/)
- [chainctl Authentication](https://edu.chainguard.dev/chainguard/chainctl-usage/getting-started-with-chainctl/)
- [Assumable Identities](https://edu.chainguard.dev/chainguard/administration/assumable-ids/)
- [Slack Bolt.js](https://slack.dev/bolt-js/)

## Conclusion

The Slack app is functionally complete and works with local chainctl authentication. For production deployment, customers need to create a Chainguard assumable identity. The key learning is that Custom Assembly customizes **existing repos** rather than creating new ones, which should be reflected in the UI.
