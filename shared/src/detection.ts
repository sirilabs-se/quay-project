export interface BinaryDetectionResult {
	name: "git" | "gh";
	installed: boolean;
	version: string | null;
}

export interface DetectionResponse {
	git: BinaryDetectionResult;
	gh: BinaryDetectionResult;
}
