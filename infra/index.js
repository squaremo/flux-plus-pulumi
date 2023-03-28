"use strict";
const k8s = require("@pulumi/kubernetes");
const pulumi = require("@pulumi/pulumi");
const flux = require("@worawat/flux");

const config = new pulumi.Config();

const bootstrapStack = `${config.require('bootstrapOrg')}/flux-plus-pulumi-bootstrap/${pulumi.getStack()}`;
const bootstrapRef = new pulumi.StackReference(bootstrapStack);

// Create a Kubernetes provider with which to apply YAMLs.
const kubeconfig = bootstrapRef.requireOutput('kubeconfig');
const cluster = new k8s.Provider('k8s-cluster', { kubeconfig });

const installFlux = flux.getFluxInstallOutput({ targetPath: 'infra/' });

const syncFlux = flux.getFluxSyncOutput({
    name: 'flux-plus-pulumi',
    targetPath: config.require('targetPath'),
    url: config.require('repo'),
    branch: config.require('branch'),
    secret: 'flulx-plus-pulumi', // don't need a secret, it's a public repo
});

// this is necessary because, though the sync doesn't need credentials, there's no way to omit the secretRef field.
const secret = new k8s.core.v1.Secret(
    'flux-plus-pulumi', {
        metadata: {
            name: syncFlux.secret,
            namespace: syncFlux.namespace,
        },
    },
    { provider: cluster },
);

const applyFluxYAMLs = new k8s.yaml.ConfigGroup('flux-apply',
                                                { yaml: [installFlux.content, syncFlux.content] },
                                                { provider: cluster });

  // # Create a Kubernetes provider (cluster client, pretty much), and use it to
  // # install Flux and the Pulumi operator.
  
  // kubernetes:
  //   type: pulumi:providers:kubernetes
  //   properties:
  //     kubeconfig: kubeconfig
          
  // flux-install:
  //   type: kubernetes:yaml:ConfigGroup
  //   properties:
  //     yaml: ${fluxInstall.content}
  //   options:
  //     provider: kubernetes

  // # There are example Pulumi programs for deploying the operator, but
  // # they are just these YAMLs transliterated into various
  // # languages. There's no Helm chart (though Engin has created one, I
  // # just never got to review & merge it).
  // pulumi-install:
  //   type: kubernetes:yaml:ConfigGroup
  //   properties:
  //     files:
  //     - https://raw.githubusercontent.com/pulumi/pulumi-kubernetes-operator/master/deploy/crds/pulumi.com_stacks.yaml
  //     - https://raw.githubusercontent.com/pulumi/pulumi-kubernetes-operator/master/deploy/crds/pulumi.com_programs.yaml
  //     - https://raw.githubusercontent.com/pulumi/pulumi-kubernetes-operator/master/deploy/crds/pulumi.com_programs.yaml
  //     - https://raw.githubusercontent.com/pulumi/pulumi-kubernetes-operator/master/deploy/yaml/service_account.yaml
  //     - https://raw.githubusercontent.com/pulumi/pulumi-kubernetes-operator/master/deploy/crds/role.yaml
  //     - https://raw.githubusercontent.com/pulumi/pulumi-kubernetes-operator/master/deploy/crds/role_binding.yaml
  //     - https://raw.githubusercontent.com/pulumi/pulumi-kubernetes-operator/master/deploy/crds/operator.yaml
  //   options:
  //     provider: kubernetes
