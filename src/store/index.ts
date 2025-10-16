// import globalReducer from './global'
// import globalReducer from '../info'
import GlobalState from './modules/global'
import globalReducer from './modules/global'
// import {updateSettings, updateUserInfo, updateHasResult} from './modules/global'
import { configureStore } from '@reduxjs/toolkit'

// 定义整个 store 的状态类型
export interface RootState {
  global: typeof GlobalState;
  // 其他 reducer 的状态
}
/* export default function createConfiguredStore() {
  return configureStore({
    reducer: {
      global: globalReducer
    }
  });
} */

export default configureStore({
  reducer: {
    global: globalReducer
  }
})