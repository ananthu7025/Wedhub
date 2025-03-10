import { isError } from "@/utils/helpers";
import { InputHTMLAttributes } from "react";
import { FieldValues, UseFormReturn, Path } from "react-hook-form";

type InputTextProps<T extends FieldValues> = {
  hookForm: UseFormReturn<T>;
  field: Path<T>;
  label: string;
  errorText: string;
  labelMandatory?: boolean;
  id?:string;
} & InputHTMLAttributes<HTMLInputElement>;

const InputText = <T extends FieldValues>({
  hookForm,
  field,
  label,
  errorText,
  // labelMandatory,
  id,
  ...props
}: InputTextProps<T>) => {
  const {
    formState: { errors },
    register,

  } = hookForm;
               
  return (
    <div className="form-group">

      <input
        {...props}
        className={`form-control ${
          isError(errors, field) ? "input-validation-error" : ""
        }`}
        {...register(field)}
        onBlur={props.onBlur}
        id={id}
      />
      
      {isError(errors, field) && (
        <span className="validation-error-text">
          <i className="icon icon-info-icon"></i>
          <h6>{errorText}</h6>
        </span>
      )}
                  <label htmlFor="contact-name" className="form-label">
     
        {label}
      </label>
    </div>
  );
};

export default InputText;
