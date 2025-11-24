import {
  Form,
  Input,
  Checkbox,
  Link,
  Button,
  Space,
} from '@arco-design/web-react';
import { FormInstance } from '@arco-design/web-react/es/Form';
import { IconLock, IconUser } from '@arco-design/web-react/icon';
import React, { useEffect, useRef, useState } from 'react';
import useStorage from '@/utils/useStorage';
import useLocale from '@/utils/useLocale';
import locale from './locale';
import styles from './style/index.module.less';
import { useStore } from '@/store1';
import cache from '@/plugins/cache';
import { useDispatch } from 'react-redux';
import { updateUserInfo, asyncUserPages } from '@/store/modules/global';
import { useHistory } from 'react-router-dom';
import { generatePermission } from '@/routes';

// import axios from 'axios';
// import { useAliveController } from 'react-activation'
// import { useNavigate } from 'react-router-dom'
// const { clear } = useAliveController()

export default function LoginForm() {
  const formRef = useRef<FormInstance>();
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginParams, setLoginParams, removeLoginParams] = useStorage('loginParams');
  const t = useLocale(locale);

  const [rememberPassword, setRememberPassword] = useState(!!loginParams);
  const history = useHistory();

  function afterLoginSuccess(params) {
    // const navigate = useNavigate()
    // 记住密码
    if (rememberPassword) {
      setLoginParams(JSON.stringify(params));
    } else {
      removeLoginParams();
    }
    // 记录登录状态
    localStorage.setItem('userStatus', 'login');
    // 跳转首页
    // window.location.href = '/';
  }

  const dispatch = useDispatch();
  const { userStore } = useStore();

  function login(params) {
    setErrorMessage('');
    setLoading(true);

    //original
    /* axios
      .post('/api/user/login', params)
      .then((res) => {
        const { status, msg } = res.data;
        if (status === 'ok') {
          afterLoginSuccess(params);
        } else {
          setErrorMessage(msg || t['login.form.login.errMsg']);
        }
      })
      .finally(() => {
        setLoading(false);
      }); */

    userStore.login({ ...params }).then(async (res: boolean) => {
      if (res) {//登录成功
        // clear()
        const infoRes = await userStore.GetInfo();
        const userInfo = { ...infoRes.user, permissions: generatePermission('admin') }
        cache.session.setJSON('user', userInfo);
        dispatch(updateUserInfo({ userInfo, userLoading: false }))

        const page = { pages: infoRes.pages, defaultPage: infoRes.defaultPage };
        // dispatch(updateUserPage(page));
        cache.session.setJSON('page', page);

        // 登录成功，判断记住我是否勾选了
        if (params.remember) {
          cache.local.set("username", params.username);
          cache.local.set('remember', params.remember);
        } else {
          cache.local.remove("username");
        }
        afterLoginSuccess(params);
        // 记录登录状态
        // localStorage.setItem('userStatus', 'login');

        // 跳转首页
        // window.location.href = '/';
        //类式组件的跳转
        // this.props.history.replace('/')
        //函数式组件的跳转

        // history.replace(infoRes.pages ? '/navigate/user' : '/index');//navigate
        history.replace(infoRes.pages ? '/bookmarks' : '/index');//navigate

      } else {
      }
    }).finally(() => {
      setLoading(false);
    })
  }

  function onSubmitClick() {
    formRef.current.validate().then((values) => {
      login(values);
    });
  }

  // 读取 localStorage，设置初始值
  useEffect(() => {
    // console.log('loginParams', loginParams)
    const rememberPassword = !!loginParams;
    setRememberPassword(rememberPassword);
    if (formRef.current && rememberPassword) {
      const parseParams = JSON.parse(loginParams);
      formRef.current.setFieldsValue(parseParams);
    }
  }, [loginParams]);

  return (
    <div className={styles['login-form-wrapper']}>
      <div className={styles['login-form-title']}>{t['login.form.title']}</div>
      <div className={styles['login-form-sub-title']}>
        {t['login.form.title']}
      </div>
      <div className={styles['login-form-error-msg']}>{errorMessage}</div>
      <Form
        className={styles['login-form']}
        layout="vertical"
        ref={formRef}
      // 记住密码就不用设置初始值了
      // initialValues={{ username: 'admin', password: 'admin123' }}
      >
        <Form.Item
          field="username"
          rules={[{ required: true, message: t['login.form.userName.errMsg'] }]}
        >
          <Input
            prefix={<IconUser />}
            placeholder={t['login.form.userName.placeholder']}
            onPressEnter={onSubmitClick}
          />
        </Form.Item>
        <Form.Item
          field="password"
          rules={[{ required: true, message: t['login.form.password.errMsg'] }]}
        >
          <Input.Password
            prefix={<IconLock />}
            // placeholder={t['login.form.password.placeholder']}
            onPressEnter={onSubmitClick}
          />
        </Form.Item>
        <Space size={16} direction="vertical">
          <div className={styles['login-form-password-actions']}>
            <Checkbox checked={rememberPassword} onChange={setRememberPassword}>
              {t['login.form.rememberPassword']}
            </Checkbox>
            <Link>{t['login.form.forgetPassword']}</Link>
          </div>
          <Button type="primary" long onClick={onSubmitClick} loading={loading}>
            {t['login.form.login']}
          </Button>
          <Button
            type="text"
            long
            className={styles['login-form-register-btn']}
          >
            {t['login.form.register']}
          </Button>
        </Space>
      </Form>
    </div>
  );
}
