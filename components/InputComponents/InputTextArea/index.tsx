/* eslint-disable @typescript-eslint/no-explicit-any */
import { isError } from "@/utils/helpers";
import { InputHTMLAttributes } from "react";
import { FieldValues, UseFormReturn, Path } from "react-hook-form";

type InputTextProps<T extends FieldValues> = {
  hookForm: UseFormReturn<T>;
  field: Path<T>;
  label: string;
  errorText: string;
  labelMandatory?: boolean;
} & InputHTMLAttributes<HTMLTextAreaElement>;

const InputTextArea = <T extends FieldValues>({
  hookForm,
  field,
  label,
  errorText,
  labelMandatory,
  ...props
}: InputTextProps<T>) => {
  const {
    formState: { errors },
    register,
  } = hookForm;

  return (
    <div className="form-group">
      <label className="form-label mandatoryRelated">
        <span
          className="mandatory"
          style={!labelMandatory ? { visibility: "hidden" } : {}}
        >
          *
        </span>
        {label}
      </label>
      <textarea
        {...props}
        className={`form-control ${
          isError(errors, field) ? "input-validation-error" : ""
        }`}
        {...register(field)}
        onBlur={props.onBlur}
      />
      {isError(errors, field) && (
        <span className="validation-error-text">
          <i className="icon icon-info-icon"></i>
          <h6>{errorText}</h6>
        </span>
      )}
    </div>
  );
};

export default InputTextArea;
