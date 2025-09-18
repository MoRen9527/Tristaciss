import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ConfigState {
  theme: 'light' | 'dark';
  language: string;
  apiEndpoint: string;
}

const initialState: ConfigState = {
  theme: 'dark',
  language: 'zh-CN',
  apiEndpoint: 'http://localhost:8008/api',
};

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    setApiEndpoint: (state, action: PayloadAction<string>) => {
      state.apiEndpoint = action.payload;
    },
  },
});

export const { setTheme, setLanguage, setApiEndpoint } = configSlice.actions;
export default configSlice.reducer;