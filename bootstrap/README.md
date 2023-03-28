# Bootstrap Flux+Pulumi

This Pulumi program creates a GKE cluster for the whole thing to run
in. I've used Pulumi YAML here to show how simple it is -- but that
stops me doing everything in one program, so there's also ../infra,
which is written for NodeJS and does some things Pulumi YAML doesn't
support.

How to use this:

0. Install some prerequisites

You'll need a Google Cloud account, and to **enable GKE in your
project**. I clicked around in the Google Cloud console to achieve
this; I needed to add a billing account to the new project, and you
probably will too.

The program here assumes you are authenticated with Google
Cloud. [Installing the Google Cloud tool `gcloud`][gcloud-install]
will let you log in.

[gcloud-install]: https://cloud.google.com/sdk/docs/downloads-interactive

1. Set up a stack:

```
pulumi stack select --create dev
```

2. Run the Pulumi program:

```
pulumi up
```

You can look around in the cluster with `kubectl`, by putting the new
cluster's kubeconfig in a local file:

```
pulumi stack output kubeconfig --show-secrets > kube.config
```

For the kubeconfig to work, you need to [install the Google Cloud auth
plugin][gcloud-auth-plugin]. Then you can do, e.g.,

```
export KUBECONFIG=$PWD/kube.config
kubectl get nodes
```

(If you re-run the stack and the cluster is recreated, you'll need to
fetch the kubeconfig again.)

[gcloud-auth-plugin]: https://cloud.google.com/blog/products/containers-kubernetes/kubectl-auth-changes-in-gke
