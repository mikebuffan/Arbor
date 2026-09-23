import {describe,expect,it} from "vitest";
import {isolatedPopplerArguments} from "./isolatedPdfParser";

const imageRef="sha256:"+"a".repeat(64);
const hostFile="/private/temp/input.pdf";
describe("isolated PDF parser command construction",()=>{
  it("binds exactly one original read-only and drops network/privileges",()=>{
    const args=isolatedPopplerArguments({
      imageRef,command:"pdftotext",hostFile,
      toolArgs:["-f","1","-l","1","-layout",hostFile,"-"],
    });
    expect(args).toContain("--network");
    expect(args).toContain("none");
    expect(args).toContain("--read-only");
    expect(args).toContain("65532:65532");
    expect(args).toContain("--cap-drop");
    expect(args).toContain("ALL");
    expect(args).toContain("type=bind,src="+hostFile+",dst=/work/source.pdf,readonly");
    expect(args).toContain("/usr/bin/pdftotext");
    expect(args).not.toContain(hostFile);
    expect(args.slice(-7)).toEqual(["-f","1","-l","1","-layout","/work/source.pdf","-"]);
  });
  it("rejects nonpinned images, arbitrary commands and missing original file",()=>{
    const base={imageRef,command:"pdfinfo",hostFile,toolArgs:[hostFile]};
    expect(()=>isolatedPopplerArguments({...base,imageRef:"latest"}))
      .toThrow("pdf_sandbox_image_digest_required");
    expect(()=>isolatedPopplerArguments({...base,command:"bash"}))
      .toThrow("pdf_sandbox_invalid_parser_request");
    expect(()=>isolatedPopplerArguments({...base,toolArgs:["other.pdf"]}))
      .toThrow("pdf_sandbox_invalid_parser_request");
  });
});
