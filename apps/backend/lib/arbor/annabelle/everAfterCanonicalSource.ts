export const EVER_AFTER_CANONICAL_SOURCE={
 manuscriptId:"3e6f799e-1702-4282-b134-95e59aed2bb6",
 title:"Ever After",
 sourceLabel:"Ever After Finished Novel(2).zip / ever-after-STANDARD.pdf",
 sourceSha256:"b8a28f514260ea7a6a2551e2628f90a0405686745f2eb90df1c25df39f159d0d",
 chapterCount:60,
 proseStored:false,
} as const;

export const EVER_AFTER_CHAPTER_TWO={
 chapterId:"726ce2ee-9628-4b2d-9d72-f8ca9b846730",
 chapterNumber:2,
 label:"Chapter I Hate",
 sourceSha256:"1d068dd6fbd5ba6f4906c8a8f5ba92e47228b9f30289af7f15f50adf2b6ec628",
 wordCount:16017,
 sourceLocator:{source:"ever-after-STANDARD.pdf",startPage:91,endPage:176},
} as const;

export type CanonicalChapterDescriptor=typeof EVER_AFTER_CHAPTER_TWO;

export function assertCanonicalEverAfterChapterTwo(input:{
 manuscriptId:string;
 manuscriptSha256:string;
 chapterNumber:number;
 chapterSourceSha256:string;
 sourceLocator:{source:string;startPage:number;endPage:number};
}):void{
 if(input.manuscriptId!==EVER_AFTER_CANONICAL_SOURCE.manuscriptId)throw new Error("annabelle_ch2_wrong_manuscript");
 if(input.manuscriptSha256!==EVER_AFTER_CANONICAL_SOURCE.sourceSha256)throw new Error("annabelle_ch2_wrong_manuscript_hash");
 if(input.chapterNumber!==2)throw new Error("annabelle_ch2_wrong_chapter");
 if(input.chapterSourceSha256!==EVER_AFTER_CHAPTER_TWO.sourceSha256)throw new Error("annabelle_ch2_wrong_source_hash");
 if(input.sourceLocator.source!==EVER_AFTER_CHAPTER_TWO.sourceLocator.source||
    input.sourceLocator.startPage!==EVER_AFTER_CHAPTER_TWO.sourceLocator.startPage||
    input.sourceLocator.endPage!==EVER_AFTER_CHAPTER_TWO.sourceLocator.endPage)
   throw new Error("annabelle_ch2_wrong_source_locator");
}
