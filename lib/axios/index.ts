"use server";
import axios from "axios";
import logger from "../winston";
import { getAccessToken } from "../cookies";

// axios instance
const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "",
  headers: {
    "Content-Type": "application/json",
  },
  validateStatus: function (status) {
    return status < 400;
  },
});
console.log(process.env.NEXT_PUBLIC_API_BASE_URL,"Base")
// request interceptor
http.interceptors.request.use(
  (config) => {
    config.headers.Authorization = "Bearer " + getAccessToken();

    // logger
    logger.info("Outgoing Request", {
      base: config.baseURL,
      url: config.url,
      method: config.method,
      headers: config.headers,
      data: config.data,
    });

    return config;
  },
  (error) => {
    return error;
  }
);

// // response interceptor
// http.interceptors.response.use(
//   (response) => {
//     return response;
//   },
//   (error) => {
//     return error;
//   }
// );

export default http;
