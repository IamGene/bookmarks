import React from 'react';
import { Layout, Anchor } from '@arco-design/web-react';
import { IconCaretUp } from '@arco-design/web-react/icon';
import { FooterProps } from '@arco-design/web-react/es/Layout/interface';
import cs from 'classnames';
const AnchorLink = Anchor.Link;
import styles from './style/index.module.less';

function Footer(props: FooterProps = {}) {
  const { className, ...restProps } = props;
  return (
    <Layout.Footer className={cs(styles.footer, className)} {...restProps}>
      Arco Design Pro
    </Layout.Footer>
  );
}

export default Footer;
