import { FieldValues, UseFormReturn, Path, PathValue } from "react-hook-form";

type InputTextProps<T extends FieldValues> = {
  hookForm: UseFormReturn<T>;
  field: Path<T>;
  label: string;
  options: [string, string];
  defaultValue?: 0 | 1;
  name?:string;
  wrapperClassName?:string;
  labelMandatory?:boolean;
};

const InputRadio = <T extends FieldValues>({
  hookForm,
  field,
  label,
  options,
  // defaultValue,
  labelMandatory,
  wrapperClassName
}: InputTextProps<T>) => {
  const { register, setValue ,watch } = hookForm;

  return (
    <div className={`yesno mandatoryRelated align-items-baseline ${wrapperClassName}`}>
       <span
            className="mandatory"
            style={!labelMandatory ? { visibility: "hidden" } : {}}
          >
            *
          </span>
      <h3>{label}</h3>
      
      <ul>
        <li>
          {["true", "false"].map((item, ind) => (
            <div className="form-check" key={ind}>
              <input
                id={`${field}-${ind}`}
                className="form-check-input"
                type="radio"
                checked={watch(field) === (ind === 0)}

                value={item}
                name={register(field).name}
                onChange={(e) => {
                  setValue(
                    field,
                    (e?.target?.value === "true") as PathValue<T, Path<T>>
                  );
                }}
              />
              <label className="form-check-label" htmlFor={`${field}-${ind}`}>
                {item === "true" ? options[0] : options[1]}
              </label>
            </div>
          ))}
        </li>
      </ul>
    </div>
  );
};

export default InputRadio;
