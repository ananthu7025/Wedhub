import React from "react";
import { z, ZodType } from "zod";
import { SelectItem } from "@/types";
import NextButton from "../NextBtn";
import toaster from "@/lib/toastify";
import { useForm } from "react-hook-form";
import { dropDownSchema } from "@/lib/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import InputText from "@/components/InputComponents/InputText";
import InputDropdown from "@/components/InputComponents/InputDropdown";
import InputTextArea from "@/components/InputComponents/InputTextArea";
import { saveBasicInfo } from "@/lib/actions/basicInfo";

interface StepProps {
  nextStep: () => void;
  prevStep: () => void;
  userId: string;
}
interface BasicFormType {
  businessName: string;
  businessPhone: string;
  location: string;
  businessAddress: string;
  contactPersonName: string;
  businessCategory?: SelectItem;
  shortDescription: string;
}

const BasicSchema: ZodType<BasicFormType> = z.object({
  businessName: z.string().nonempty("Business name is required").max(300),
  businessPhone: z.string().nonempty("Business phone is required").max(15),
  location: z.string().nonempty("Location is required"),
  businessAddress: z.string().nonempty("Business address is required"),
  contactPersonName: z.string().nonempty("Contact person name is required"),
  businessCategory: dropDownSchema.optional(),
  shortDescription: z
    .string()
    .max(500, "Description must be 500 characters or less"),
});

const BasicInfo: React.FC<StepProps> = ({ nextStep, userId }) => {
  console.log(userId);
  const hookForm = useForm<BasicFormType>({
    resolver: zodResolver(BasicSchema),
  });
  const {
    handleSubmit,
    formState: { errors },
  } = hookForm;

  console.log(errors);

  const onSubmit = async (data: BasicFormType) => {
    console.log(data);
    const payload = {
      ...data,
      userId: userId,
      businessCategory: Number(data.businessCategory?.value),
    };
    const res = await saveBasicInfo(payload);
    console.log(res, "responce");
    toaster.success("Success");
    if(res.data?.userId){
    nextStep();
  }
  };

  return (
    <div className="boarding-form">
      <div className="row">
        <div className="col-lg-4">
          <div className="logo-head-wrap side-head-wrap mb-0">
            <h1 className="main-head">
              Welcome!
              <br />
              Let&apos;s Get Started
            </h1>
            <span>Fill in your basic details to kick off the process.</span>
          </div>
        </div>
        <div className="col-lg-4">
          <form id="multi-step-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="step ">
              <div className="input-group mb-3 mt-1">
                <InputText
                  id="contact-name"
                  hookForm={hookForm}
                  field="businessName"
                  label="Full Name"
                  labelMandatory
                  errorText="Invalid full name"
                  type="text"
                  max={300}
                  placeholder=""
                />
              </div>
              <div className="input-group mb-3">
                <InputText
                  id="contact-number"
                  hookForm={hookForm}
                  field="businessPhone"
                  label="Phone Number"
                  labelMandatory
                  errorText="Invalid number"
                  type="tel"
                  max={300}
                  placeholder=""
                />
              </div>
              <div className="input-group mb-3">
                <InputText
                  id="contact-number"
                  hookForm={hookForm}
                  field="location"
                  label=" Location"
                  labelMandatory
                  errorText="Invalid  Location"
                  type="text"
                  max={300}
                  placeholder=""
                />
              </div>
              <div className="input-group mb-3">
                <InputText
                  id="contact-adress"
                  hookForm={hookForm}
                  field="businessAddress"
                  label=" Business Address"
                  labelMandatory
                  errorText="Invalid  Address"
                  type="text"
                  max={300}
                  placeholder=""
                />
              </div>
              <div className="input-group mb-3">
                <InputText
                  id="contact-adressssssss"
                  hookForm={hookForm}
                  field="contactPersonName"
                  label="Contact Person Name"
                  labelMandatory
                  errorText="Invalid  Name"
                  type="text"
                  max={300}
                  placeholder=""
                />
              </div>
              <div className="input-group mb-3">
                <InputDropdown
                  hookForm={hookForm}
                  field="businessCategory"
                  errorText="Select an option"
                  label="Business Category"
                  labelMandatory
                  options={[
                    {
                      label: "option 1",
                      value: "option 1",
                    },
                  ]}
                  placeholder=""
                />
              </div>
              <div className="input-group mb-3">
                <InputTextArea
                  hookForm={hookForm}
                  field="shortDescription"
                  label="Summary"
                  errorText="Invalid summary"
                  placeholder=""
                  id="summarssssy"
                  maxLength={500}
                />
              </div>
              <NextButton type="submit" />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BasicInfo;
