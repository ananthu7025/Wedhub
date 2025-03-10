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
  isMuliple?: boolean;
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
    container: (base: any) => ({
      ...base,
      width: "100%",
    }),
    control: (base: any) => ({
      ...base,
      backgroundColor: "#fff",
      borderRadius: "4px",
      border: "1px solid #ccc",
      padding: "8px 12px",
      fontSize: "14px",
      cursor: isDisabled ? "not-allowed" : "pointer",
      minHeight: "36px",
      boxShadow: "none",
      "&:hover": {
        borderColor: "#00796b",
      },
    }),
    menu: (base: any) => ({
      ...base,
      zIndex: 9999, // Make sure dropdown appears above other elements
      maxHeight: "200px",
      overflowY: "auto",
    }),
    option: (base: any, state: any) => ({
      ...base,
      padding: "8px 12px",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      backgroundColor: state.isFocused
        ? "#f1f1f1"
        : state.isSelected
        ? "#00796b"
        : "",
      color: state.isSelected ? "white" : "black",
    }),
    placeholder: (base: any) => ({
      ...base,
      color: "#aaa",
      fontSize: "14px",
    }),
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
            menuPlacement="auto"
            classNamePrefix="custom-select"
            className={`custom-dropdown ${
              isError(errors, field) ? "error" : ""
            }`}
            isClearable
            value={inField.value ? (inField.value as any) : ""}
            isMulti={isMuliple}
            isDisabled={isDisabled}
            styles={customStyles}
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

export default InputDropdown;
