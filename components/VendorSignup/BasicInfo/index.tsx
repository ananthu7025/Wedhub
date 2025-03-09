import React from "react";

interface StepProps {
  nextStep: () => void;
  prevStep: () => void;
}

const BasicInfo: React.FC<StepProps> = ({ nextStep, prevStep }) => {
  return (
    <div className="boarding-form">
      <div className="row">
        <div className="col-lg-4">
          <div className="logo-head-wrap side-head-wrap mb-0">
            <h1 className="main-head">
              Welcome!
              <br />
              Let's Get Started
            </h1>
            <span>Fill in your basic details to kick off the process.</span>
          </div>
        </div>
        <div className="col-lg-4">
          <form id="multi-step-form">
            <div className="step ">
              <div className="input-group mb-3 mt-1">
                <input
                  type="text"
                  className="form-control"
                  id="contact-name"
                  placeholder=" "
                />
                <label htmlFor="contact-name" className="form-label">
                  Contact Person Name
                </label>
              </div>
              <div className="input-group mb-3">
                <input
                  type="tel"
                  className="form-control"
                  id="contact-number"
                  placeholder=" "
                />
                <label htmlFor="contact-number" className="form-label">
                  Business Phone
                </label>
              </div>
              <div className="input-group mb-3">
                <input
                  type="text"
                  className="form-control"
                  id="location"
                  placeholder=" "
                />
                <label htmlFor="location" className="form-label">
                  Location
                </label>
              </div>
              <div className="input-group mb-3">
                <input
                  type="text"
                  className="form-control"
                  id="address"
                  placeholder=" "
                />
                <label htmlFor="address" className="form-label">
                  Business Address
                </label>
              </div>
              <div className="input-group mb-3">
                <input
                  type="text"
                  className="form-control"
                  id="contact-name"
                  placeholder=" "
                />
                <label htmlFor="contact-name" className="form-label">
                  Contact Person Name
                </label>
              </div>
              <div className="input-group mb-3">
                <select
                  name="business-catergory"
                  id=""
                  className="form-control"
                >
                  <option value="">Business Category</option>
                  <option value="">Business Category</option>
                  <option value="">Business Category</option>
                  <option value="">Business Category</option>
                </select>
              </div>
              <div className="input-group mb-3">
                <textarea
                  name="description"
                  id=""
                  className="form-control"
                  cols={4}
                  rows={3}
                  defaultValue={""}
                />
                <label htmlFor="contact-name" className="form-label">
                  Short Description
                </label>
              </div>
              <button 
                onClick={nextStep}
              
              className="theme-btn">
                <a 
                >
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
                </a>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BasicInfo;
