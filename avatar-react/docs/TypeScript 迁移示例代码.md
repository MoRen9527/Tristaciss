# TypeScript 迁移示例代码

## 组件类型定义示例

### 1. 基础组件Props类型

```typescript
// SciFiButton.tsx
interface SciFiButtonProps {
  children: React.ReactNode;
  variant?: 'outlined' | 'contained' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  glowColor?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  sx?: any;
  [key: string]: any;
}

const SciFiButton: React.FC<SciFiButtonProps> = ({ 
  children, 
  variant = 'outlined', 
  color = 'primary',
  glowColor = '#00ffff',
  ...props 
}) => {
  // 组件实现
};
```

### 2. Redux Hooks类型化

```typescript
// hooks/redux.ts
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '../store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### 3. 使用类型化Hooks

```typescript
// App.tsx
import { useAppDispatch, useAppSelector } from './hooks/redux';

const App = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector(state => state.auth);
  
  // 现在有完整的类型支持和自动补全
};
```

## API类型定义示例

### 1. API响应类型

```typescript
// types/api.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token?: string;
  expiresIn?: number;
}
```

### 2. 类型化API函数

```typescript
// services/api.ts
export const authAPI = {
  login: (credentials: LoginRequest): Promise<LoginResponse> => {
    return api.post('/auth/login', credentials);
  },
  
  getCurrentUser: (): Promise<{ user: User }> => {
    return api.get('/auth/me');
  }
};
```

## Redux Store类型化示例

### 1. AsyncThunk类型定义

```typescript
// store/authSlice.ts
export const login = createAsyncThunk<
  User,                    // 返回类型
  LoginCredentials,        // 参数类型
  { rejectValue: string }  // 错误类型
>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      return response.user;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);
```

### 2. Slice状态类型

```typescript
const initialState: AuthState & { loginSuccess: boolean } = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,
  loginSuccess: false
};
```

## 环境变量类型定义

```typescript
// types/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // 添加其他环境变量类型
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

## 事件处理器类型

```typescript
// 鼠标事件
const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
  // 处理点击事件
};

// 表单事件
const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  // 处理表单提交
};

// 输入事件
const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  setValue(event.target.value);
};
```

## 高级类型工具

```typescript
// 工具类型
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// 使用示例
type PartialUser = Optional<User, 'email' | 'avatar'>;
type RequiredUser = RequiredFields<User, 'id' | 'username'>;
```

## 迁移前后对比

### 迁移前 (JavaScript)
```javascript
const SciFiButton = ({ children, onClick, ...props }) => {
  // 没有类型检查
  return <Button onClick={onClick} {...props}>{children}</Button>;
};
```

### 迁移后 (TypeScript)
```typescript
interface SciFiButtonProps {
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  // 其他props...
}

const SciFiButton: React.FC<SciFiButtonProps> = ({ children, onClick, ...props }) => {
  // 完整的类型检查和IDE支持
  return <Button onClick={onClick} {...props}>{children}</Button>;
};
```

## 最佳实践

1. **严格类型定义**: 避免使用 `any`，尽量定义精确的类型
2. **接口优于类型别名**: 对于对象结构使用 `interface`
3. **泛型使用**: 在需要复用的地方使用泛型
4. **类型守卫**: 使用类型守卫确保运行时类型安全
5. **渐进式迁移**: 先迁移核心模块，再逐步扩展