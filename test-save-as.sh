#!/bin/bash
# Test if we can use --save-as with a non-interactive editor

# Create the build config
cat > /tmp/custom-build.yaml << 'YAML'
contents:
  packages:
    - python-3.14
    - curl
YAML

# Try using a script as the editor that just copies our file
cat > /tmp/fake-editor.sh << 'EDITOR'
#!/bin/bash
# Copy our prepared config to the file chainctl wants us to edit
cp /tmp/custom-build.yaml "$1"
EDITOR

chmod +x /tmp/fake-editor.sh

# Set this script as the editor
export EDITOR=/tmp/fake-editor.sh

# Try the edit command with --save-as
chainctl image repo build edit --parent aaaa1111bbbb2222cccc3333dddd4444eeee5555 --repo node --save-as test-python-node --yes 2>&1 || echo "Command failed: $?"

