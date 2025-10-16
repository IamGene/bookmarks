/*
 * @Author: Zhouhai 497675647@qq.com
 * @Date: 2022-09-28 15:27:09
 * @LastEditors: Zhouhai 497675647@qq.com
 * @LastEditTime: 2024-04-16 16:45:39
 */
import { makeAutoObservable } from 'mobx';
import { getInfo, login, logout } from '@/api/login';
import cache from '@/plugins/cache';
import { LoginInfo } from '../type.d/login';
import { MenuDomain, UserDomain } from '@/type.d/system';
import { getToken, removeToken, setToken } from '@/utils1/auth';
// import { createStore } from 'redux';
// const store = createStore(rootReducer);
const api = import.meta.env.VITE_REACT_APP_BASE_API;
const ip = import.meta.env.VITE_REACT_APP_BASE_IP;
const port = import.meta.env.VITE_REACT_APP_BASE_PORT;
const protocol = import.meta.env.VITE_REACT_APP_PROTOCOL;

class UserStore {
	token: string = '';
	user: UserDomain = cache.session.getJSON('user') || {};
	name: string = this.user?.nickName || ''; //用户名字
	avatar: string = this.user?.avatar || '';//用户头像，用于个人信息展示，页面右上角头像展示
	roles: string[] = cache.session.get('userRoles')?.split(',') || [];//角色信息，暂时用不到
	permissions: string[] = cache.session.get('userPermissions')?.split(',') || []; //权限标志集合
	allmenus: MenuDomain[] = cache.session.getJSON('allmenus') || [];//所有菜单，用于tab名称显示
	menus: MenuDomain[] = cache.session.getJSON('menus') || [];//有权限的菜单，用于菜单界面,数据格式是树形的

	constructor() {
		makeAutoObservable(this);
		this.name = this.user.nickName || ''
		// const avatar = (this.user.avatar === '' || this.user.avatar === null) ? require('@/assets/images/profile.jpg') : `http://localhost:8080/api/${this.user.avatar}`;
		const avatar = (this.user.avatar === '' || this.user.avatar === null) ? `https://img-blog.csdnimg.cn/b34f8299204a48bdb1338212740e3c8e.png` : `http://localhost:8080/api/${this.user.avatar}`;
		// : `${process.env.REACT_APP_BASE_API}${this.user.avatar}`;
		this.avatar = avatar
	}

	get getRoles() {
		return this.roles;
	}

	get getPermissions() {
		return this.permissions;
	}

	get getName() {
		return this.name;
	}

	get getAvatar() {
		return this.avatar;
	}

	GetInfo = async (): Promise<any> => {

		return new Promise((resolve, reject) => {
			getInfo()
				.then((res: any) => {
					this.user = res.user;
					console.log('res.user', res.user)
					//设置到Redux变量
					/* store.dispatch({
						type: 'update-userInfo',
						payload: { userInfo: { ...defaultUserInfo }, userLoading: false },
					}); */

					// this.dispatch({
					// 	type: 'update-userInfo',
					// 	payload: {
					// 		userInfo: defaultUserInfo
					// 	},
					// });

					// cache.session.setJSON('user', res.user);
					const avatar = (this.user.avatar === '' || this.user.avatar == null)
						// ? require('@/assets/images/profile.jpg')
						? `https://img-blog.csdnimg.cn/b34f8299204a48bdb1338212740e3c8e.png`
						// : `http://localhost:8080/api/${this.user.avatar}`;
						: `${protocol}${ip}:${port}${api}${this.user.avatar}`;
					if (res.roles && res.roles.length > 0) {
						// 验证返回的roles是否是一个非空数组
						this.roles = res.roles;
						cache.session.set('userRoles', res.roles);
						this.permissions = res.permissions;
						cache.session.set('userPermissions', res.permissions);
					} else {
						this.roles = ['ROLE_DEFAULT'];
					}
					this.name = this.user.userName || '';
					this.avatar = avatar;
					this.menus = res.menus;
					cache.session.setJSON('menus', res.menus);
					this.allmenus = res.allmenus
					cache.session.setJSON('allmenus', res.allmenus);
					resolve(res);
				})
				.catch((error) => {
					reject(error);
				});
		});
	};

	private getMenu(_menus: MenuDomain[], _path: string): MenuDomain | null {
		if (_menus) {
			for (let i = 0; i < _menus.length; i++) {
				// console.log(_path,_menus[i].path);
				const children = _menus[i].children
				if ('/' + _menus[i].path === _path) {
					return _menus[i];
				} else if (children) {
					const c = this.getMenu(children, _path);
					if (c) {
						return c;
					}
				}
			}
		}

		return null;
	}

	getMenuByPath(path: string) {
		return this.getMenu(cache.session.getJSON('menus'), path);
	}

	get getToken() {
		return getToken();
	}

	login = async (loginInfo: LoginInfo): Promise<boolean> => {
		return login(loginInfo)
			.then((res: any) => {
				setToken(res.token);
				this.token = res.token;
				return true;
			})
			.catch(() => {
				return false;
			});
	};

	islogin = (): boolean => {
		const token = getToken()
		if (token) {
			return true;
		} else {
			return false;
		}
	};

	//Zhouhai
	LogOut = async (): Promise<void> => {
		return new Promise((resolve, reject) => {
			logout().then(() => {
				removeToken();
				this.roles = [];
				this.permissions = [];
				this.name = '';
				this.avatar = '';

				cache.session.remove('userRoles');
				cache.session.remove('userPermissions');
				cache.session.remove('user');
				cache.session.remove('allmenus');
				cache.session.remove('menus');
				cache.session.remove('routers');

				cache.session.remove('page');
				cache.session.remove('sessionObj');

				resolve();
			}).catch((error) => [
				reject(error)
			])
		});
	};

	setUserAvatar(imgurl: string) {
		const avatar = (imgurl === '' || imgurl === null)
			? require('@/assets/images/profile.jpg')
			: imgurl;
		this.avatar = avatar;
		this.user.avatar = avatar
		cache.session.setJSON('user', this.user);
	}

	setUser(data: UserDomain) {
		this.user = data;
		cache.session.setJSON('user', data);
	}

	hasPerms(permkey: string) {
		// return matchPerm(this.permissions, permkey)
	}
}

export { UserStore };
