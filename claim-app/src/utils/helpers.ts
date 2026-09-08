import type { AnyFieldApi } from "@tanstack/react-form";

export const getErrorMessage = (
  field: AnyFieldApi,
  type: "onChange" | "onBlur" = "onChange"
) => {
  return field.state.meta.isBlurred &&
    field.state.meta.isTouched &&
    field.state.meta.errorMap[type]
    ? field.state.meta.errorMap[type]
        .map((err: any) => err?.message)
        .join(". ")
    : undefined;
};



// placeholder
export const suggestCodeBasedOnName= (name:string, length:number = 7)=>{
    return (
        name + "0098"
    )
}