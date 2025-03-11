"use client";
import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import BasicInfo from "@/components/VendorSignup/BasicInfo";
import Portfolio from "@/components/VendorSignup/Portfolio";
import AdditionalInfo from "@/components/VendorSignup/AdditionalInfo";
import PricingAndPackage from "@/components/VendorSignup/PricingAndPackage";

const VendorSignup = () => {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const userId = searchParams.get("id");

  const nextStep = () => {
    setCurrentStep((prevStep) => prevStep + 1);
  };

  const prevStep = () => {
    setCurrentStep((prevStep) => prevStep - 1);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfo
            userId={userId ? userId : ""}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 2:
        return (
          <Portfolio
            userId={userId ? userId : ""}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 3:
        return (
          <AdditionalInfo
            userId={userId ? userId : ""}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 4:
        return (
          <PricingAndPackage
            userId={userId ? userId : ""}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      default:
        return (
          <BasicInfo
            userId={userId ? userId : ""}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
    }
  };
  console.log(currentStep, "c");
  return (
    <div className="basic-info-main">
      <div className="container-fluid">
        <div className="logo-progress-head">
          <div className="row align-items-center">
            <div className="col-lg-3">
              <div className="logo-head-wrap mb-0">
                <h2 className="mb-0">
                  Wed<span>HUB</span>
                </h2>
              </div>
            </div>
            <div className="col-lg-9">
              <ol className="steps">
                <li className={`step ${currentStep === 1 ? "is-active" : ""}`}>
                  Basic Information
                </li>
                <li className={`step ${currentStep === 2 ? "is-active" : ""}`}>
                  Portfolio
                </li>
                <li className={`step ${currentStep === 3 ? "is-active" : ""}`}>
                  Additional Info.
                </li>
                <li className={`step ${currentStep === 4 ? "is-active" : ""}`}>
                  Packages & Pricing
                </li>
              </ol>
            </div>
          </div>
        </div>
        <div className="boarding-form">{renderStep()}</div>
      </div>
    </div>
  );
};

export default VendorSignup;
