#!/usr/bin/env bash
set -Eeo pipefail

print_help () {
  echo "node-bash-installer"
  echo "installs node from the attached tarball."
  echo "usage: bash $0"
}

for opt in $@; do case $opt in
    -h|--help) print_help ; exit 0;;
esac; done

tarball_head=$(awk '/^__TARBALL__/ {print NR + 1;exit 0;}' $0)

if [ "$os" = "darwin" ]; then
  tail -n+$tarball_head $0 | sudo tar xzPs '|^[^/]*/|/usr/local/|' --include '*/*/*'
else
  tail -n+$tarball_head $0 | sudo tar xzP --xform 's|^[^/]*/|/usr/local/|' --wildcards '*/*/*'
fi

echo "[node-bash-installer] successfully installed node $(node -v) + npm $(npm -v)"
exit 0

__TARBALL__