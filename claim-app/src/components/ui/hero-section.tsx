import { Button } from "./button";


export function HeroSection() {
    return(
      <div className="flex-1 h-full  flex items-center">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium text-3xl mb-2">Claim.</h1>
          <p>A voucher system inspired by <a target="_blank" href="https://chowdeck.com" className="underline underline-offset-2">Chowdeck&apos;s new voucher feature</a>.</p>
          <p>This probably only recreates like ~50% of the real thing but it is a good learning experience.
          </p>
          <div className="flex gap-2 mt-2">
            <Button className="cursor-pointer" variant={"outline"}>Redeem a voucher</Button>
            <Button className="cursor-pointer">Create a voucher</Button>       
          </div>
        </div>
      </div>
    </div>
    )
}