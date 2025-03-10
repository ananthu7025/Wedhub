import React from "react";
import Image from "next/image";

import { z, ZodType } from "zod";
import BackButton from "../BackBtn";
import NextButton from "../NextBtn";
import SkipSection from "../SkipBtn";
import toaster from "@/lib/toastify";
import { useForm } from "react-hook-form";
import Facebook from "@/assets/images/fb.webp";
import InstaImg from "@/assets/images/insta.webp";
import twitter from "@/assets/images/twiter.webp";
import Website from "@/assets/images/website.webp";
import { zodResolver } from "@hookform/resolvers/zod";
import InputText from "@/components/InputComponents/InputText";


interface StepProps {
  nextStep: () => void;
  prevStep: () => void;
}

interface BasicFormType {
  yearsOfExperience?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    x?: string;
    website?: string;
  };
}

const BasicSchema: ZodType<BasicFormType> = z.object({
  yearsOfExperience: z.string().optional(),
  socialLinks: z
    .object({
      instagram: z.string().optional(),
      facebook: z.string().optional(),
      x: z.string().optional(),
      website: z.string().optional(),
    })
    .optional(),
});

const AdditionalInfo: React.FC<StepProps> = ({ nextStep, prevStep }) => {
  const hookForm = useForm<BasicFormType>({
    resolver: zodResolver(BasicSchema),
  });
  const {
    handleSubmit,
    formState: { errors },
  } = hookForm;

  console.log(errors);

  const onSubmit = (data: BasicFormType) => {
    console.log(data);
    toaster.success("Success");
    nextStep();
  };

  return (
    <div className="boarding-form">
      <div className="row">
        <div className="col-lg-4">
          <div className="logo-head-wrap side-head-wrap mb-0">
            <BackButton onClick={prevStep} />
            <h1 className="main-head">
              Tell Us More
              <br />
              About You
            </h1>
            <span>Help us know you better.</span>
          </div>
        </div>
        <div className="col-lg-4">
          <form id="" onSubmit={handleSubmit(onSubmit)}>
            <div className="step ">
              <div className="input-group mb-3 mt-1">
                <InputText
                  id="contact-name"
                  hookForm={hookForm}
                  field="yearsOfExperience"
                  label="  Years of Experience"
                  labelMandatory
                  errorText="Invalid full name"
                  type="text"
                  max={300}
                  placeholder=""
                />
              </div>
              <p>Social Links (URLs)</p>
              <div className="input-group mb-3">
                <a className="social-media-link">
                  <InputText
                    id="contact-name"
                    hookForm={hookForm}
                    field="socialLinks.instagram"
                    label=""
                    errorText=""
                    type="text"
                    max={300}
                    placeholder=""
                  />
                  <Image src={InstaImg} alt="" />
                  <span>Instagram</span>
                </a>
                <a className="social-media-link">
                  <InputText
                    id="contact-name"
                    hookForm={hookForm}
                    field="socialLinks.facebook"
                    label=""
                    errorText=""
                    type="text"
                    max={300}
                    placeholder=""
                  />
                  <Image src={Facebook} alt="" />
                  <span>Facebook</span>
                </a>
                <a className="social-media-link">
                  <InputText
                    id="contact-name"
                    hookForm={hookForm}
                    field="socialLinks.x"
                    label=""
                    errorText=""
                    type="text"
                    max={300}
                    placeholder=""
                  />
                  <Image src={twitter} alt="" />
                  <span>X</span>
                </a>
                <a className="social-media-link">
                  <InputText
                    id="contact-name"
                    hookForm={hookForm}
                    field="socialLinks.website"
                    label=""
                    errorText=""
                    type="text"
                    max={300}
                    placeholder=""
                  />
                  <Image src={Website} alt="" />
                  <span>Website</span>
                  <span>
                    <a>Create One with us?</a>
                  </span>
                </a>
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

export default AdditionalInfo;
