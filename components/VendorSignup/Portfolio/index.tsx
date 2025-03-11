import React from "react";
import Image from "next/image";

import { z } from "zod";
import BackButton from "../BackBtn";
import NextButton from "../NextBtn";
import SkipSection from "../SkipBtn";
import toaster from "@/lib/toastify";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { savePortfolio } from "@/lib/actions/portfolio";
import uploadImage from "@/assets/images/add-media-icon.webp";
import InputText from "@/components/InputComponents/InputText";
import InputTextArea from "@/components/InputComponents/InputTextArea";

interface StepProps {
  nextStep: () => void;
  prevStep: () => void;
  userId: string;
}

type PortfolioType = {
  portfolio: {
    title: string;
    description: string;
    media?: string[];
  };
};

const portfolioSchema: z.ZodType<PortfolioType> = z.object({
  portfolio: z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    media: z.array(z.string()).optional(),
  }),
});

const Portfolio: React.FC<StepProps> = ({ nextStep, prevStep, userId }) => {
  const hookForm = useForm<PortfolioType>({
    resolver: zodResolver(portfolioSchema),
  });
  const {
    handleSubmit,
    formState: { errors },
  } = hookForm;

  const onSubmit = async (data: PortfolioType) => {
    const payload = {
      userId,
      portfolio: [
        {
          title: data.portfolio.title ?? "",
          description: data.portfolio.description ?? "",
          media: data.portfolio.media ?? [],
        },
      ],
    };

    const res = await savePortfolio(payload);
    console.log(res, "response");
    toaster.success("Success");
    if (res.data?.userId) {
      nextStep();
    }
  };

  console.log(errors);

  return (
    <div className="boarding-form">
      <div className="row">
        <div className="col-lg-4">
          <div className="logo-head-wrap side-head-wrap mb-0">
            <BackButton onClick={prevStep} />
            <h1 className="main-head">
              Show Us Your
              <br />
              Best Work!
            </h1>
            <span>
              Upload your portfolio and images to
              <br />
              showcase your talents.
            </span>
          </div>
        </div>
        <div className="col-lg-4">
          <form id="multi-step-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="step ">
              <div className="input-group mb-3 mt-1">
                <InputText
                  id="contact-name"
                  hookForm={hookForm}
                  field="portfolio.title"
                  label="Portfolio Title"
                  labelMandatory
                  errorText="Invalid full name"
                  type="text"
                  max={300}
                  placeholder=""
                />
              </div>
              <div className="input-group mb-3">
                <InputTextArea
                  hookForm={hookForm}
                  field="portfolio.description"
                  label="Short Description"
                  errorText="Invalid summary"
                  placeholder=""
                  id="summarssssy"
                  maxLength={500}
                />
              </div>
              <div className="input-group mb-3">
                <div className="form-control image-file-input">
                  <Image src={uploadImage} alt="" />
                  <p>
                    Add Photos &amp; Videos
                    <br />
                    <span className="small-text">Max size per file (3MB)</span>
                  </p>
                </div>
              </div>
              <NextButton type="submit" />
            </div>
            <SkipSection onSkip={nextStep} />
          </form>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
