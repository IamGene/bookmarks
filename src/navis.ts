import auth, { AuthParams } from '@/utils/authentication';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

// 两个对象属性的组合
export type INavi = AuthParams & {
  name: string;
  key: string;
  id: number;
  pid?: number;
  pId?: string;
  // 当前页是否展示面包屑
  breadcrumb?: boolean;
  children?: INavi[];
  // 当前路由是否渲染菜单项，为 true 的话不会在菜单中显示，但可通过路由地址访问。
  ignore?: boolean;
  path: string;
};

export const routes: INavi[] = [
  {
    name: 'menu.dashboard',
    key: 'dashboard',
    id: 1,
    path: 'dashboard',
    children: [
      {
        name: 'menu.dashboard.workplace',
        key: 'dashboard/workplace',
        id: 2,
        pid: 1,
        path: 'menu.dashboard.workplace'
      },
      {
        name: 'menu.dashboard.monitor',
        key: 'dashboard/monitor',
        /* requiredPermissions: [
          { resource: 'menu.dashboard.monitor', actions: ['write'] },
        ], */
        id: 3,
        pid: 1,
        path: 'menu.dashboard.workplace'
      },
    ],
  },
  {
    name: 'menu.visualization',
    key: 'visualization',
    id: 4,
    path: 'visualization',
    children: [
      {
        name: 'menu.visualization.dataAnalysis',
        key: 'visualization/data-analysis',
        requiredPermissions: [
          { resource: 'menu.visualization.dataAnalysis', actions: ['read'] },
        ],
        id: 5,
        pid: 4,
        path: 'visualization',
      },
      {
        name: 'menu.visualization.multiDimensionDataAnalysis',
        key: 'visualization/multi-dimension-data-analysis',
        id: 6,
        pid: 4,
        path: 'visualization/multi-dimension-data-analysis',
        requiredPermissions: [
          {
            resource: 'menu.visualization.dataAnalysis',
            actions: ['read', 'write'],
          },
          {
            resource: 'menu.visualization.multiDimensionDataAnalysis',
            actions: ['write'],
          },
        ],
        oneOfPerm: true,
      },
    ],
  },
  // more ... 
];

export const getName = (path: string, routes) => {
  return routes.find((item) => {
    const itemPath = `/${item.key}`;
    if (path === itemPath) {
      return item.name;
    } else if (item.children) {
      return getName(path, item.children);
    }
  });
};

// 根据角色生成菜单的读/写权限
export const generatePermission = (role: string) => {
  const actions = role === 'admin' ? ['*'] : ['read'];
  const result = {};
  routes.forEach((item) => {
    if (item.children) {
      item.children.forEach((child) => {
        result[child.name] = actions;
      });
    }
  });
  return result;
};

const useNavi = (userPermission): [INavi[], string] => {
  /*  const filterRoute = (routes: IRoute[], arr = []): IRoute[] => {
     if (!routes.length) {
       return [];
     }
     for (const route of routes) {
       //根据权限判断该路由是否显示
       const { requiredPermissions, oneOfPerm } = route;
       let visible = true;
       if (requiredPermissions) {
         visible = auth({ requiredPermissions, oneOfPerm }, userPermission);
       }
       if (!visible) {
         continue;
       }
       //递归调用 过滤当前route的children中有权限(显示)的
       if (route.children && route.children.length) {
         const newRoute = { ...route, children: [] };
         filterRoute(route.children, newRoute.children);
         //过滤后数组不为空
         if (newRoute.children.length) {
           arr.push(newRoute);
         }
       } else {
         arr.push({ ...route });
       }
     }
     return arr;
   };
  */
  const [permissionRoute, setPermissionRoute] = useState(routes);

  const getTreeData = () => {
    axios
      // .get('http://localhost:9000/navigation/menus')
      .get('api/navigation/menus')
      .then((res) => {
        // setList(res.data);
        setPermissionRoute(res.data)
      })
  };

  /*  
   useEffect(() => {
      // 权限路由：过滤展示路由 b
      // const newRoutes = filterRoute(routes);
      // setPermissionRoute(routes);
      getTreeData();
    }, [JSON.stringify(userPermission)]); 
    */

  // 默认路由： 展开并展示的第一个路由
  const defaultRoute = useMemo(() => {
    // permissionRoute左侧菜单路由 默认路由=第1项dashboard
    const first = permissionRoute[0];
    if (first) {
      const firstRoute = first?.children?.[0]?.key || first.key;
      return firstRoute;
    }
    return '';
  }, [permissionRoute]);

  return [permissionRoute, defaultRoute];
};

export default useNavi;
