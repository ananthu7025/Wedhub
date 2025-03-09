import React from 'react';

interface StepProps {
  nextStep: () => void;
  prevStep: () => void;
}

const Portfolio: React.FC<StepProps> = ({ nextStep, prevStep }) => {
  return (
    <div className="boarding-form">
    <div className="row">
      <div className="col-lg-4">
        <div className="logo-head-wrap side-head-wrap mb-0">
          <a href="portfolio.html" className="mb-3">
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.3105 10.7509H19.25C19.4489 10.7509 19.6397 10.83 19.7803 10.9706C19.921 11.1113 20 11.302 20 11.5009C20 11.6999 19.921 11.8906 19.7803 12.0313C19.6397 12.1719 19.4489 12.2509 19.25 12.2509H5.3105L10.781 17.7199C10.9218 17.8608 11.0009 18.0518 11.0009 18.2509C11.0009 18.4501 10.9218 18.6411 10.781 18.7819C10.6402 18.9228 10.4492 19.0019 10.25 19.0019C10.0508 19.0019 9.85983 18.9228 9.719 18.7819L2.969 12.0319C2.89915 11.9623 2.84374 11.8795 2.80593 11.7884C2.76812 11.6973 2.74866 11.5996 2.74866 11.5009C2.74866 11.4023 2.76812 11.3046 2.80593 11.2135C2.84374 11.1224 2.89915 11.0396 2.969 10.9699L9.719 4.21995C9.85983 4.07912 10.0508 4 10.25 4C10.4492 4 10.6402 4.07912 10.781 4.21995C10.9218 4.36078 11.0009 4.55178 11.0009 4.75095C11.0009 4.95011 10.9218 5.14112 10.781 5.28195L5.3105 10.7509Z"
                fill="#333333"
              />
            </svg>
            <span>Back</span>
          </a>
          <h1 className="main-head">
            Tell Us More
            <br />
            About You
          </h1>
          <span>Help us know you better.</span>
        </div>
      </div>
      <div className="col-lg-4">
        <form id="">
          <div className="step ">
            <div className="input-group mb-3 mt-1">
              <input
                type="text"
                className="form-control"
                id="experience-yrs"
                placeholder=" "
              />
              <label htmlFor="experience-yrs" className="form-label">
                Years of Experience
              </label>
            </div>
            <p>Social Links (URLs)</p>
            <div className="input-group mb-3">
              <a href="" className="social-media-link">
                <img src="images/insta.webp" alt="" />
                <span>Instagram</span>
              </a>
              <a href="" className="social-media-link">
                <img src="images/fb.webp" alt="" />
                <span>Facebook</span>
              </a>
              <a href="" className="social-media-link">
                <img src="images/twiter.webp" alt="" />
                <span>X</span>
              </a>
              <a href="" className="social-media-link">
                <img src="images/website.webp" alt="" />
                <span>Website</span>
                {/* <span><a href="">Create One with us?</a></span> */}
              </a>
            </div>
            <button className="theme-btn"
                onClick={nextStep}
            
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
            </button>
          </div>
          <div className="skip-sec">
            <a href="package-pricing.html">
              <span>Skip for now</span>
              <svg
                width={18}
                height={16}
                viewBox="0 0 18 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15.1895 7.24997H1.25C1.05109 7.24997 0.860322 7.32899 0.71967 7.46964C0.579018 7.61029 0.5 7.80106 0.5 7.99997C0.5 8.19888 0.579018 8.38965 0.71967 8.5303C0.860322 8.67095 1.05109 8.74997 1.25 8.74997H15.1895L9.719 14.219C9.57817 14.3598 9.49905 14.5508 9.49905 14.75C9.49905 14.9491 9.57817 15.1401 9.719 15.281C9.85983 15.4218 10.0508 15.5009 10.25 15.5009C10.4492 15.5009 10.6402 15.4218 10.781 15.281L17.531 8.53097C17.6008 8.4613 17.6563 8.37854 17.6941 8.28742C17.7319 8.1963 17.7513 8.09862 17.7513 7.99997C17.7513 7.90132 17.7319 7.80364 17.6941 7.71252C17.6563 7.6214 17.6008 7.53864 17.531 7.46897L10.781 0.718971C10.6402 0.578141 10.4492 0.499023 10.25 0.499023C10.0508 0.499023 9.85983 0.578141 9.719 0.718971C9.57817 0.859801 9.49905 1.05081 9.49905 1.24997C9.49905 1.44913 9.57817 1.64014 9.719 1.78097L15.1895 7.24997Z"
                  fill="#333333"
                />
              </svg>
            </a>
            <p className="small-text">(You can add these later from profile)</p>
          </div>
        </form>
      </div>
    </div>
  </div>
  
  );
};

export default Portfolio;
