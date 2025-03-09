import React, { useState } from "react";

const Stepper = ({ steps }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="stepper-container">
      <div className="steps-header">
        <div className="logo">
          <h2>
            Wed<span>HUB</span>
          </h2>
        </div>
        <ol className="steps">
          {steps.map((step, index) => (
            <li key={index} className={`step ${currentStep === index ? "is-active" : ""}`}>
              {step.title}
            </li>
          ))}
        </ol>
      </div>

      <div className="step-content">
        {steps[currentStep].component}
      </div>

      <div className="stepper-navigation">
        <button onClick={handlePrev} disabled={currentStep === 0} className="prev-btn">
          Previous
        </button>
        <button onClick={handleNext} disabled={currentStep === steps.length - 1} className="next-btn">
          Next
        </button>
      </div>
    </div>
  );
};

export default Stepper;
