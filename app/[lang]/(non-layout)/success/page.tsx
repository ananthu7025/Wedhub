/* eslint-disable react/no-unescaped-entities */
import React from "react";
import LottieAnimation from "@/components/success";

const Success = () => {
  return (
    <div className="main">
      <div className="container">
        <div className="success-wrap">
          <div className="logo-head-wrap mb-0">
            <h2 className="mb-0">
              Wed<span>HUB</span>
            </h2>
          </div>
          <div className="allset-wrap">
            <LottieAnimation />
            <h2 className="main-head">You're All Set!</h2>
            <p>Your profile is ready. Click below to go to your dashboard.</p>
            <button className="theme-btn">
              Next
              <svg
                width={18}
                height={16}
                viewBox="0 0 18 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M14.6895 7.25H0.75C0.551088 7.25 0.360322 7.32902 0.21967 7.46967C0.0790178 7.61032 0 7.80109 0 8C0 8.19891 0.0790178 8.38968 0.21967 8.53033C0.360322 8.67098 0.551088 8.75 0.75 8.75H14.6895L9.219 14.219C9.07817 14.3598 8.99905 14.5508 8.99905 14.75C8.99905 14.9492 9.07817 15.1402 9.219 15.281C9.35983 15.4218 9.55084 15.5009 9.75 15.5009C9.94916 15.5009 10.1402 15.4218 10.281 15.281L17.031 8.531C17.1008 8.46133 17.1563 8.37857 17.1941 8.28745C17.2319 8.19633 17.2513 8.09865 17.2513 8C17.2513 7.90135 17.2319 7.80367 17.1941 7.71255C17.1563 7.62143 17.1008 7.53867 17.031 7.469L10.281 0.719001C10.1402 0.578171 9.94916 0.499054 9.75 0.499054C9.55084 0.499054 9.35983 0.578171 9.219 0.719001C9.07817 0.859831 8.99905 1.05084 8.99905 1.25C8.99905 1.44916 9.07817 1.64017 9.219 1.781L14.6895 7.25Z"
                  fill="#F0F2F5"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Success;
