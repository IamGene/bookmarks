import React, { useMemo } from 'react';
// import { GlobalState } from '@/store';
import { RootState } from '@/store';
import { useSelector } from 'react-redux';
import authentication, { AuthParams } from '@/utils/authentication';

type PermissionWrapperProps = AuthParams & {
  backup?: React.ReactNode;
};

const PermissionWrapper = (
  props: React.PropsWithChildren<PermissionWrapperProps>
) => {
  const { backup, requiredPermissions, oneOfPerm } = props;
  // const userInfo = useSelector((state: GlobalState) => state.userInfo);

  const globalState = useSelector((state: RootState) => state.global);
  const { userInfo } = globalState;
  const hasPermission = useMemo(() => {
    return authentication(
      { requiredPermissions, oneOfPerm },
      userInfo.permissions
    );
  }, [oneOfPerm, requiredPermissions, userInfo.permissions]);

  if (hasPermission) {
    return <>{convertReactElement(props.children)}</>;
  }
  if (backup) {
    return <>{convertReactElement(backup)}</>;
  }
  return null;
};

function convertReactElement(node: React.ReactNode): React.ReactElement {
  if (!React.isValidElement(node)) {
    return <>{node}</>;
  }
  return node;
}

export default PermissionWrapper;
