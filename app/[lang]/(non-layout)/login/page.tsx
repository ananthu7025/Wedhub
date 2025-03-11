import React from "react";
import Image from "next/image";

import frameOne from "@/assets/images/frame1.webp";
import frameTwo from "@/assets/images/frame2.webp";
import frameThree from "@/assets/images/frame3.webp";
import frameFour from "@/assets/images/frame4.webp";
import frameFive from "@/assets/images/frame5.webp";
import LoginForm from "@/components/Login";

const Login = () => {
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
            <LoginForm />
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
