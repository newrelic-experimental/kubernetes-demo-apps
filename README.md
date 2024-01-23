[![New Relic Experimental header](https://github.com/newrelic/opensource-website/raw/master/src/images/categories/Experimental.png)](https://opensource.newrelic.com/oss-category/#new-relic-experimental)

# Kubernetes Demo Apps ![Build and publish](https://github.com/newrelic-experimental/kubernetes-demo-apps/workflows/Build%20and%20publish/badge.svg)

The repo contains a set of applications for Kubernetes that simulate a working production environment. The applications include: our APM agents + distributed tracing set-up, kubernetes health checks, resource limits, and much more. This set of applications can be used in the K8S NRU Instruqt tracks and for lightning talks and demo’s.

## Getting Started

1) You need a New Relic account and license key. You can create one on https://newrelic.com/signup

2) Deploy a Kubernetes secret with your New Relic license key: `kubectl create secret generic newrelic-bundle-newrelic-infrastructure-config --from-literal=license='[[NEW RELIC LICENSE KEY]]'`

3) Deploy the applications on a Kubernetes cluster with `kubectl apply -f yaml/`

## Support

If you encounter any issues, have feedback or ideas. Please don't hesitate to create a ticket.

## Contributing
We encourage your contributions to improve the Kubernetes Demo Apps! Keep in mind when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You only have to sign the CLA one time per project.
If you have any questions, or to execute our corporate CLA, required if your contribution is on behalf of a company,  please drop us an email at opensource@newrelic.com.

## License
Kubernetes Demo Apps is licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.
