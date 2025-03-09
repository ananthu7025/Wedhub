/* eslint-disable @typescript-eslint/no-explicit-any */
import Select from "react-select";
import { SelectItem } from "@/types";
import { FieldValues, UseFormReturn, Path, Controller } from "react-hook-form";
import { isError } from "@/utils/helpers";
 
type InputTextProps<T extends FieldValues> = {
  hookForm: UseFormReturn<T>;
  field: Path<T>;
  label: string;
  errorText: string;
  options: SelectItem[];
  placeholder: string;
  labelMandatory?: boolean;
  isMuliple?:boolean;
  isDisabled?: boolean;
  isClearable?: boolean;
};
 
const InputDropdown = <T extends FieldValues>({
  hookForm,
  field,
  label,
  errorText,
  options,
  placeholder,
  labelMandatory,
  isMuliple,
  isDisabled,
}: InputTextProps<T>) => {
  const {
    formState: { errors },
    register,
    control,
  } = hookForm;
  const customStyles = {
    multiValue: (base: any) => ({
      ...base,
      backgroundColor: "#fff",
      borderRadius: "12px",
      padding: "2px 8px",
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      color: "#00796b",
      fontWeight: "bold",
    }),
    multiValueRemove: (base: any) => ({
      ...base,
      color: "#00796b",
      ":hover": {
        backgroundColor: "#004d40",
        color: "white",
      },
    }),
  };
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
 
      <Controller
        name={register(field).name}
        control={control}
        render={({ field: inField }) => (
          <Select
            options={options}
            onChange={(selectedOption) => inField.onChange(selectedOption)}
            placeholder={placeholder}
            classNamePrefix="custom-select"
            className={`custom-dropdown ${
              isError(errors, field) ? "error" : ""
            }`}
            isClearable
            value={inField.value?inField.value as any:""}
            isMulti={isMuliple}
            isDisabled={isDisabled}
            styles={isMuliple ? customStyles : undefined}
 
          />
        )}
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
 
export default InputDropdown