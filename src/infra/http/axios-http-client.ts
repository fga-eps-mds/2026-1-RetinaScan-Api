import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

export interface CreateHttpClientOptions {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export function createHttpClient(options: CreateHttpClientOptions = {}): AxiosInstance {
  const { baseURL, timeout = 30_000, headers } = options;

  return axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

export type { AxiosInstance, AxiosRequestConfig };
