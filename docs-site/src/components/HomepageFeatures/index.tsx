import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Fully Private Architecture',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        AroraDB operates within a zero-trust VPC environment. The EKS control plane is entirely private, 
        and application traffic is routed exclusively through internal load balancers to ensure maximum security.
      </>
    ),
  },
  {
    title: 'Stateless OIDC Auth',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        Authentication is completely offloaded to the AWS Application Load Balancer and AWS Cognito. 
        The Go backend remains entirely stateless, relying on cryptographically verified JWT signatures.
      </>
    ),
  },
  {
    title: 'High Performance Storage',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        Leveraging the EBS CSI driver, AroraDB StatefulSets are backed by gp3 NVMe volumes, 
        providing guaranteed IOPS and throughput for demanding database workloads.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
