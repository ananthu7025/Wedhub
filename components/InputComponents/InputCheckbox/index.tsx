import { isError } from "@/utils/helpers";
import { InputHTMLAttributes } from "react";
import { FieldValues, UseFormReturn, Path } from "react-hook-form";

type InputCheckboxProps<T extends FieldValues> = {
  hookForm: UseFormReturn<T>;
  field: Path<T>;
  label: string;
  errorText: string;
  labelMandatory?: boolean;
} & InputHTMLAttributes<HTMLInputElement>;

const InputCheckbox = <T extends FieldValues>({
  hookForm,
  field,
  label,
  errorText,
  labelMandatory,
  ...props
}: InputCheckboxProps<T>) => {
  const {
    formState: { errors },
    register,
  } = hookForm;

  return (
    <div className="customCheckbox form-group">
      <div className="form-group">
        <input type="checkbox" id={field} {...props} {...register(field)} />
        <label
          htmlFor={field}
          className={`form-check-label ${
            isError(errors, field) ? "disclaimbox" : ""
          }`}
        >
          <span
            className="mandatory"
            style={!labelMandatory ? { visibility: "hidden" } : {}}
          >
            *
          </span>
          {label}
        </label>
      </div>
      {isError(errors, field) && (
        <span className="validation-error-text">
          <i className="icon icon-info-icon"></i>
          <h6>{errorText}</h6>
        </span>
      )}
    </div>
  );
};

export default InputCheckbox;
