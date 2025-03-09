"use client";

import { z, ZodType } from "zod";
import toaster from "@/lib/toastify";
import { SelectItem } from "@/types";
import { useForm } from "react-hook-form";
import { DevTool } from "@hookform/devtools";
import StoreProvider from "@/store/provider";
import { ToastContainer } from "react-toastify";
import { zodResolver } from "@hookform/resolvers/zod";
import { dropDownSchema, phoneSchema } from "@/lib/zod";
import InputText from "@/components/InputComponents/InputText";
import InputRadio from "@/components/InputComponents/InputRadio";
// import InputPhone from "@/components/InputComponents/InputPhone";
import InputTextArea from "@/components/InputComponents/InputTextArea";
import InputDropdown from "@/components/InputComponents/InputDropdown";
// import InputNationality from "@/components/InputComponents/InputNationality";
import InputCheckbox from "@/components/InputComponents/InputCheckbox";

interface BasicFormType {
  fullName: string;
  email: string;
  pressure?: boolean;
  summary?: string;
  phone: string;
  dropdown: SelectItem;
  nationality: SelectItem;
  checkbox: boolean;
}

const BasicSchema: ZodType<BasicFormType> = z.object({
  fullName: z.string().nonempty("Full name is required").max(300),
  email: z.string().email("Enter a valid email address"),
  pressure: z.boolean(),
  checkbox: z.boolean().refine((value) => value === true, {
    message: "You must agree before proceeding.",
  }),
  summary: z
    .string()
    .max(500)
    .transform((v) => v.trim()),
  phone: phoneSchema,
  dropdown: dropDownSchema,
  nationality: dropDownSchema,
});

const ExampleComponent = () => {
  const hookForm = useForm<BasicFormType>({
    resolver: zodResolver(BasicSchema),
    defaultValues: {
      pressure: true,
      checkbox: false,
    },
  });
  const { handleSubmit, control } = hookForm;

  const onSubmit = (data: BasicFormType) => {
    console.log(data);
    toaster.success("Success");
  };

  return (
    <>
      <div>
        <ToastContainer />
        <h2>Basic Form</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="row">
            <div className="col-md-6">
              <InputText
                hookForm={hookForm}
                field="fullName"
                label="Full Name"
                labelMandatory
                errorText="Invalid full name"
                type="text"
                max={300}
                placeholder="Enter your full name"
              />
            </div>
          </div>
          <div className="row">
            <div className="col-md-6">
              <InputText
                hookForm={hookForm}
                field="email"
                label="Email"
                labelMandatory
                errorText="Invalid email address"
                type="email"
                placeholder="Enter email address"
              />
            </div>
          </div>
          <InputRadio
            hookForm={hookForm}
            field="pressure"
            label="Do you manage pressure well?"
            options={["Yes", "No"]}
          />
          <div className="row">
            <div className="col-md-6">
              <InputTextArea
                hookForm={hookForm}
                field="summary"
                label="Summary"
                errorText="Invalid summary"
                placeholder="Enter summary"
                maxLength={500}
              />
            </div>
          </div>
          <div className="col-md-6">
            {/* <InputPhone
              hookForm={hookForm}
              field="phone"
              label="Phone Number"
              labelMandatory
              errorText="Invalid phone number"
            /> */}
          </div>
          <div className="col-md-6">
            <InputDropdown
              hookForm={hookForm}
              field="dropdown"
              errorText="Select an option"
              label="Dropdown"
              labelMandatory
              options={[
                {
                  label: "option 1",
                  value: "option 1",
                },
              ]}
              placeholder="Select option"
            />
          </div>
          <div className="col-md-6">
            {/* <InputNationality
              hookForm={hookForm}
              field="nationality"
              label="Nationality"
              labelMandatory
              errorText="Select a nationality"
              placeholder="Select nationality"
            /> */}
          </div>
          <InputCheckbox
            hookForm={hookForm}
            field="checkbox"
            label="I agree to the terms"
            labelMandatory
            errorText="You must agree before submitting."
          />
          <button type="submit">Submit</button>
        </form>
      </div>
      <DevTool control={control} />
    </>
  );
};

const Examples = () => (
  <StoreProvider>
    <ExampleComponent />
  </StoreProvider>
);

export default Examples;
