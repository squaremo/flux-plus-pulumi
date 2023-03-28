# Infrastructure for Flux+Pulumi

This sets up Flux to sync files from ../sync in the repository you
nominate, to the cluster created in the bootstrap stack. It assumes
you've run the Pulumi program in `../bootstrap`; specifically, it
expects to be able to reference
`{org}/flux-plus-pulumi-bootstrap/{stack}`, where `org` and `stack`
are the same as those you choose here.

To use this as a stack,

0. Install the program's dependencies:

```
npm install
```

The kubeconfig from the bootstrap stage refers to a special Google
Cloud authentication plugin. You can install it with the instructions
[here][gcloud-auth-plugin], if you didn't already.

1. Create a stack and set the config item `repo`, e.g.,

```
pulumi stack select --create dev
pulumi config set repo https://github.com/squaremo/flux-plus-pulumi
```

That particular git repo will work OK since it is public and you don't
need to write to it. But, if you want to experiment, you'll need to
fork it or use some other repo.

You can also set `branch` (default `"main"`) if you want to sync from
a different branch, and `targetPath` (default `"sync"`) if you use a
different directory for your YAMLs.

2. Run the stack:

```
pulumi up
```

This installs Flux, and creates a GitRepository and a Kustomization
that will sync from the repo you supplied in config.

[gcloud-auth-plugin]: https://cloud.google.com/blog/products/containers-kubernetes/kubectl-auth-changes-in-gke
