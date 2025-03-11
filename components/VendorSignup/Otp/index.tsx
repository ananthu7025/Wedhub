/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from "react";

import { useLanguage } from "@/hooks";
import { sendOtp } from "@/lib/actions/auth";
import { generatePath } from "@/utils/helpers";
import { useRouter, useSearchParams } from "next/navigation";
import toaster from "@/lib/toastify";
import NxtSvg from "@/components/Svg/NextBtnSvg/indx";

const OtpCompnent = () => {
  const router = useRouter();
  const lang = useLanguage();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");
  const email = searchParams.get("email");
  const role = searchParams.get("role");

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    if (!otp) {
      toaster.error("Please enter the OTP");
      setLoading(false);
    }
    const data = {
      email: email ? email : "",
      otp: otp ? otp : "",
    };
    const res = await sendOtp(data);
    if(res.errors){
        toaster.error(res.errors[0])
    }
    if (res && role === "vendor") {
      toaster.success(res.messages[0]);
      setLoading(false);
      router.push(
        generatePath(
          lang,
          `/vendor-stepper?id=${userId}&email=${email}&role=${role}`
        )
      );
    } else if (res.data?.userId) {
      setLoading(false);

      router.push(generatePath(lang, `/dashboard`));
    }
  };

  return (
    <div className="col-lg-7">
      <div className="login-sec otp-sec">
        <div className="logo-head-wrap otp-sec">
          <h2>
            Wed<span>HUB</span>
          </h2>
          <h1>We’ve sent you a 6-digit verification code to</h1>
          <p className="content-text">
            {email}
            <a href="#">
              <svg
                className="ms-2"
                width={18}
                height={21}
                viewBox="0 0 18 21"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3.414 14.89L13.556 4.74798L12.142 3.33398L2 13.476V14.89H3.414ZM4.243 16.89H0V12.647L11.435 1.21198C11.6225 1.0245 11.8768 0.919189 12.142 0.919189C12.4072 0.919189 12.6615 1.0245 12.849 1.21198L15.678 4.04098C15.8655 4.2285 15.9708 4.48281 15.9708 4.74798C15.9708 5.01314 15.8655 5.26745 15.678 5.45498L4.243 16.89ZM0 18.89H18V20.89H0V18.89Z"
                  fill="#333333"
                />
              </svg>
            </a>
          </p>
        </div>
        <form className="col-md-12" onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              className="form-control"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter the code"
            />
            <p className="content-text mb-3">
              Code not received?{" "}
              <a href="basic-information.html">Resend code</a>
            </p>
          </div>
          <button disabled={loading} type="submit" className="theme-btn">
            Next
            <NxtSvg />
          </button>
        </form>
      </div>
    </div>
  );
};

export default OtpCompnent;
