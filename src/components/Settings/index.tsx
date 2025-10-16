import React, { useState } from 'react';
import { Drawer, Alert, Message } from '@arco-design/web-react';
import { IconSettings } from '@arco-design/web-react/icon';
import copy from 'copy-to-clipboard';
import { useSelector } from 'react-redux';
import { GlobalState } from '@/store/modules/global';
import Block from './block';
import ColorPanel from './color';
import IconButton from '../NavBar/IconButton';
import useLocale from '@/utils/useLocale';
import { RootState } from '@/store';

interface SettingProps {
  trigger?: React.ReactElement;
}

function Setting(props: SettingProps) {
  const { trigger } = props;
  const [visible, setVisible] = useState(false);
  const locale = useLocale();

  // const settings = useSelector((state: GlobalState) => state.settings);
  const globalState = useSelector((state: RootState) => state.global);
  const { settings } = globalState;

  function onCopySettings() {
    copy(JSON.stringify(settings, null, 2));
    Message.success(locale['settings.copySettings.message']);
  }

  return (
    <div style={{
      marginTop: '14px'
    }}>
      {trigger ? (
        React.cloneElement(trigger as React.ReactElement, {
          onClick: () => setVisible(true),
        })
      ) : (
        <IconButton icon={<IconSettings />} onClick={() => setVisible(true)} />
      )}
      <Drawer
        width={300}
        title={
          <>
            <IconSettings />
            {locale['settings.title']}
          </>
        }
        visible={visible}
        okText={locale['settings.copySettings']}
        cancelText={locale['settings.close']}
        onOk={onCopySettings}
        onCancel={() => setVisible(false)}
      >
        <Block title={locale['settings.themeColor']}>
          <ColorPanel />
        </Block>
        <Block
          title={locale['settings.content']}
          options={[
            { name: 'settings.navbar', value: 'navbar' },
            { name: 'settings.menu', value: 'menu' },
            { name: 'settings.footer', value: 'footer' },
            { name: 'settings.menuWidth', value: 'menuWidth', type: 'number' },
          ]}
        />
        <Block
          title={locale['settings.otherSettings']}
          options={[{ name: 'settings.colorWeek', value: 'colorWeek' }]}
        />
        <Alert content={locale['settings.alertContent']} />
      </Drawer>
      {/* </> */}
    </div>
  );
}

export default Setting;
