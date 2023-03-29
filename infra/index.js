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
    secret: 'flux-plus-pulumi', // don't need a secret, it's a public repo
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

// Pulumi operator Stack objects will need an access token to connect
// to the Pulumi service, to store state. This assumes the token is in
// the environment, and puts it in a well-known secret, so it can
// referenced from Stack objects.
const pulumiSecret = new k8s.core.v1.Secret(
    'pulumi-token', {
        metadata: {
            name: 'pulumi-token',
            namespace: 'default',
        },
        stringData: {
            PULUMI_ACCESS_TOKEN: process.env['PULUMI_ACCESS_TOKEN'],
        },
    },
    { provider: cluster },
);

// This is the key for using with the operator, fetched from the bootstrap stack. I could just create it here, since it's not used there. Bleep bloop.
const googleSecret = new k8s.core.v1.Secret(
    'google-key', {
        metadata: {
            name: 'google-key',
            namespace: 'default',
        },
        stringData: {
            GOOGLE_CREDENTIALS: bootstrapRef.requireOutput('serviceAccountKey'),
        },
    },
    { provider: cluster },
);

const applyFluxYAMLs = new k8s.yaml.ConfigGroup('flux-apply',
                                                { yaml: [installFlux.content, syncFlux.content] },
                                                { provider: cluster });

