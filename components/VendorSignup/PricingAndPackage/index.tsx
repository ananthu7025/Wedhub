import React from "react";
import { z } from "zod";
import BackButton from "../BackBtn";
import NextButton from "../NextBtn";
import SkipSection from "../SkipBtn";
import toaster from "@/lib/toastify";
import { useLanguage } from "@/hooks";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { generatePath } from "@/utils/helpers";
import { zodResolver } from "@hookform/resolvers/zod";
import { savePackage } from "@/lib/actions/pricingAndPackage";
import InputText from "@/components/InputComponents/InputText";
import InputTextArea from "@/components/InputComponents/InputTextArea";

interface StepProps {
  nextStep: () => void;
  prevStep: () => void;
  userId: string;
}
interface BasicFormType {
  packageName: string;
  description: string;
  price: string;
  inclusions: string;
}

const BasicFormSchema = z.object({
  packageName: z.string().min(1, "Package name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.string(),
  inclusions: z.string().min(1, "Inclusion item cannot be empty"),
});

const PricingAndPackage: React.FC<StepProps> = ({
  nextStep,
  prevStep,
  userId,
}) => {
  const hookForm = useForm<BasicFormType>({
    resolver: zodResolver(BasicFormSchema),
  });
  const router = useRouter();
  const lang = useLanguage();

  const {
    handleSubmit,
    formState: { errors },
  } = hookForm;

  console.log(errors);

  const onSubmit = async (data: BasicFormType) => {
    const payload = {
      userId,
      packages: [
        {
          packageName: data.packageName ?? "",
          description: data.description ?? "",
          price: Number(data.price) ?? "",
          inclusions: data.inclusions ?? "",
        },
      ],
    };

    const res = await savePackage(payload);
    console.log(res, "response");
    toaster.success("Success");
    if (res.data?.userId) {
      router.push(generatePath(lang, `/success`));
    }
  };

  return (
    <div className="boarding-form">
      <div className="row">
        <div className="col-lg-4">
          <div className="logo-head-wrap side-head-wrap mb-0">
            <BackButton onClick={prevStep} />
            <h1 className="main-head">
              Define Your
              <br />
              Packages &amp; Pricing
            </h1>
            <span>Set up your offerings and prices for your clients.</span>
          </div>
        </div>
        <div className="col-lg-4">
          <form id="" onSubmit={handleSubmit(onSubmit)}>
            <div className="step ">
              <div className="input-group mb-3 mt-1">
                <InputText
                  id="contact-name"
                  hookForm={hookForm}
                  field="packageName"
                  label="Package name"
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
                  field="description"
                  label="Package Description"
                  errorText="Invalid summary"
                  placeholder=""
                  id="summarssssy"
                  maxLength={500}
                />
              </div>
              <div className="input-group mb-3 mt-1">
                <InputText
                  id="contact-name"
                  hookForm={hookForm}
                  field="price"
                  label="Package Price"
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
                  field="inclusions"
                  label="inclusion"
                  errorText="Invalid summary"
                  placeholder=""
                  id="summarssssy"
                  maxLength={500}
                />
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

export default PricingAndPackage;
