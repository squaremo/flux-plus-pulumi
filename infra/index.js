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

// I _could_ use another ConfigGroup to install the Pulumi operator --
// but, since I've got Flux now, I can just drop some syncs into the
// git repository, instead.

// const pulumiOperator = new k8s.yaml.ConfigGroup('pulumi-apply',
//                                                 {
//                                                     files: [
//                                                         'crds/pulumi.com_stacks.yaml',
//                                                         'crds/pulumi.com_programs.yaml',
//                                                         'yaml/service_account.yaml',
//                                                         'yaml/role.yaml',
//                                                         'yaml/role_binding.yaml',
//                                                         'yaml/operator.yaml'
//                                                     ].map(f => `https://raw.githubusercontent.com/pulumi/pulumi-kubernetes-operator/master/deploy/${f}`)
//                                                 },
//                                                 { provider: cluster })
