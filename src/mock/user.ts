import Mock from 'mockjs';
import { isSSR } from '@/utils/is';
import setupMock from '@/utils/setupMock';
import { generatePermission } from '@/routes';

if (!isSSR) {
  Mock.XHR.prototype.withCredentials = true;

  setupMock({
    setup: () => {
      // 用户信息
      const userRole = window.localStorage.getItem('userRole') || 'admin';

      Mock.mock(new RegExp('/dev-api/getInfo'), () => {
        return Mock.mock({
          "msg": "操作成功",
          "defaultPage": 1900000000,
          "code": 200,
          "pages": [
            2000000000,
            1900000000
          ],
          "user": {
            "createBy": "admin1",
            "createTime": "2024-08-23 20:44:27",
            "updateBy": null,
            "updateTime": null,
            "remark": "测试员",
            "userId": 2,
            "deptId": 105,
            "userName": "ry",
            "nickName": "若依",
            "email": "ry@qq.com",
            "phonenumber": "15666666666",
            "sex": "1",
            "avatar": "profile/avatar/2024/01/06/blob_20240106142934A002.png",
            "password": null,
            "status": "0",
            "delFlag": "0",
            "loginIp": "127.0.0.1",
            "loginDate": "2025-09-24T21:32:08.000+08:00",
            "dept": {
              "createBy": null,
              "createTime": null,
              "updateBy": null,
              "updateTime": null,
              "remark": null,
              "deptId": 105,
              "parentId": 101,
              "ancestors": "0,100,101",
              "deptName": "测试部门",
              "orderNum": 3,
              "leader": "若依",
              "phone": null,
              "email": null,
              "status": "0",
              "delFlag": null,
              "parentName": null,
              "excludeId": null,
              "children": []
            },
            "admin": false
          }
        });
      });


      Mock.mock(new RegExp('/api/user/userInfo'), () => {
        return Mock.mock({
          name: 'admin',
          avatar:
            'https://lf1-xgcdn-tos.pstatp.com/obj/vcloud/vadmin/start.8e0e4855ee346a46ccff8ff3e24db27b.png',
          email: 'wangliqun@email.com',
          job: 'frontend',
          jobName: '前端开发工程师',
          organization: 'Frontend',
          organizationName: '前端',
          location: 'beijing',
          locationName: '北京',
          introduction: '王力群并非是一个真实存在的人。',
          personalWebsite: 'https://www.arco.design',
          verified: true,
          phoneNumber: /177[*]{6}[0-9]{2}/,
          accountId: /[a-z]{4}[-][0-9]{8}/,
          registrationTime: Mock.Random.datetime('yyyy-MM-dd HH:mm:ss'),
          permissions: generatePermission(userRole),
        });
      });

      // 登录
      Mock.mock(new RegExp('/api/user/login'), (params) => {
        const { userName, password } = JSON.parse(params.body);
        if (!userName) {
          return {
            status: 'error',
            msg: '用户名不能为空',
          };
        }
        if (!password) {
          return {
            status: 'error',
            msg: '密码不能为空',
          };
        }
        if (userName === 'admin' && password === 'admin') {
          return {
            status: 'ok',
          };
        }
        return {
          status: 'error',
          msg: '账号或者密码错误',
        };
      });
    },
  });
}
