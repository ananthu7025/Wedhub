import React from "react";
import frameOne from "@/assets/images/frame1.webp";
import frameTwo from "@/assets/images/frame2.webp";
import frameThree from "@/assets/images/frame3.webp";
import frameFour from "@/assets/images/frame4.webp";
import frameFive from "@/assets/images/frame5.webp";
import Image from "next/image";
import Register from "@/components/VendorSignup/Register";

const VendorReg = () => {
  return (
    <>
      <div className="main">
        <div className="container-fluid p-0">
          <div className="row">
            <div className="col-lg-5">
              <div className="img-wrapper">
                <div className="image-col">
                  <div className="image1">
                    <Image src={frameOne} alt="image" className="img1" />
                  </div>
                  <div className="image1">
                    <Image src={frameTwo} alt="image" className="img1" />
                  </div>
                </div>
                <div className="image-col">
                  <div className="image2">
                    <Image src={frameThree} alt="image" className="img1" />
                  </div>
                  <div className="image2">
                    <Image src={frameFour} alt="image" className="img1" />
                  </div>
                  <div className="image2">
                    <Image src={frameFive} alt="image" className="img1" />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-7">
              <div className="login-sec">
                <div className="logo-head-wrap">
                  <h2>
                    Wed<span>HUB</span>
                  </h2>
                  <h1>Create your account.</h1>
                  <span>
                    Already a member? <a href="login.html">Login</a>{" "}
                  </span>
                  {/* <img src="images/logo.webp" alt=""> */}
                </div>
                <div className="google-login">
                  <span>
                    <svg
                      width={31}
                      height={32}
                      viewBox="0 0 31 32"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g clipPath="url(#clip0_402_49)">
                        <path
                          d="M10.9414 1.95771C7.93776 2.99971 5.34739 4.97746 3.55082 7.60047C1.75425 10.2235 0.846174 13.3535 0.959966 16.5307C1.07376 19.7079 2.20342 22.765 4.18303 25.2527C6.16264 27.7405 8.88785 29.5279 11.9584 30.3523C14.4477 30.9946 17.0558 31.0229 19.5585 30.4345C21.8256 29.9253 23.9216 28.836 25.6413 27.2733C27.4312 25.5972 28.7303 23.465 29.3991 21.1059C30.126 18.5404 30.2554 15.8425 29.7772 13.2193H15.7983V19.018H23.894C23.7322 19.9428 23.3855 20.8255 22.8746 21.6132C22.3637 22.401 21.6991 23.0775 20.9206 23.6024C19.9321 24.2564 18.8177 24.6963 17.649 24.8942C16.477 25.1121 15.2747 25.1121 14.1026 24.8942C12.9147 24.6486 11.7909 24.1582 10.8029 23.4545C9.21555 22.3309 8.0237 20.7346 7.39739 18.8935C6.76048 17.0179 6.76048 14.9845 7.39739 13.1089C7.84321 11.7942 8.58022 10.5971 9.5534 9.60711C10.6671 8.45335 12.0771 7.62864 13.6286 7.22345C15.1801 6.81827 16.8133 6.84828 18.3489 7.31017C19.5485 7.67842 20.6455 8.32181 21.5524 9.18906C22.4652 8.28093 23.3765 7.37046 24.2862 6.45763C24.7559 5.96677 25.2679 5.4994 25.7306 4.9968C24.3462 3.70854 22.7213 2.70611 20.9488 2.04696C17.7211 0.87498 14.1895 0.843484 10.9414 1.95771Z"
                          fill="white"
                        />
                        <path
                          d="M10.9414 1.95769C14.1892 0.842708 17.7209 0.873375 20.9488 2.04459C22.7216 2.70822 24.3458 3.71547 25.7282 5.00853C25.2585 5.51113 24.7629 5.98085 24.2838 6.46936C23.3726 7.37905 22.4621 8.28561 21.5524 9.18904C20.6455 8.32179 19.5485 7.6784 18.3489 7.31016C16.8138 6.84664 15.1807 6.8149 13.6287 7.21843C12.0768 7.62195 10.6659 8.44515 9.55104 9.5977C8.57786 10.5877 7.84085 11.7848 7.39502 13.0995L2.52637 9.32995C4.26905 5.87413 7.2864 3.23069 10.9414 1.95769Z"
                          fill="#E33629"
                        />
                        <path
                          d="M1.23458 13.0642C1.49626 11.7673 1.93071 10.5114 2.52631 9.32996L7.39496 13.1089C6.75806 14.9845 6.75806 17.0179 7.39496 18.8935C5.77286 20.1461 4.14998 21.4049 2.52631 22.67C1.0353 19.7021 0.58057 16.3206 1.23458 13.0642Z"
                          fill="#F8BD00"
                        />
                        <path
                          d="M15.7984 13.2169H29.7773C30.2555 15.8402 30.1261 18.5381 29.3992 21.1035C28.7304 23.4626 27.4312 25.5949 25.6414 27.271C24.0702 26.045 22.4919 24.8284 20.9207 23.6024C21.6997 23.077 22.3646 22.3997 22.8755 21.6111C23.3864 20.8226 23.7328 19.939 23.894 19.0133H15.7984C15.7961 17.0827 15.7984 15.1498 15.7984 13.2169Z"
                          fill="#587DBD"
                        />
                        <path
                          d="M2.52393 22.67C4.14759 21.4175 5.77048 20.1586 7.39258 18.8935C8.02014 20.7353 9.2137 22.3316 10.8028 23.4545C11.7939 24.155 12.9201 24.6413 14.1096 24.8824C15.2817 25.1004 16.4839 25.1004 17.656 24.8824C18.8246 24.6846 19.939 24.2446 20.9276 23.5907C22.4988 24.8167 24.0771 26.0332 25.6483 27.2592C23.9288 28.8227 21.8328 29.9129 19.5654 30.4228C17.0627 31.0111 14.4546 30.9829 11.9653 30.3406C9.99648 29.8149 8.15746 28.8882 6.56352 27.6186C4.87643 26.2791 3.49849 24.5911 2.52393 22.67Z"
                          fill="#319F43"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_402_49">
                          <rect
                            width="30.0621"
                            height="30.0621"
                            fill="white"
                            transform="translate(0.468994 0.968933)"
                          />
                        </clipPath>
                      </defs>
                    </svg>
                  </span>
                  <p>Continue with Google</p>
                </div>
              <Register/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VendorReg;
