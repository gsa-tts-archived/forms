import * as z from 'zod';

import { type FieldsetPattern } from '../../patterns/fieldset/config.js';
import { type InputPattern } from '../../patterns/input/config.js';
import { PagePattern } from '../../patterns/page/config.js';
import { PageSetPattern } from '../../patterns/page-set/config.js';
import { type ParagraphPattern } from '../../patterns/paragraph.js';
import { type CheckboxPattern } from '../../patterns/checkbox.js';
import { type RadioGroupPattern } from '../../patterns/radio-group.js';
import { RichTextPattern } from '../../patterns/rich-text.js';

import { uint8ArrayToBase64 } from '../../util/base64.js';
import { type DocumentFieldMap } from '../types.js';
import {
  createPattern,
  FormConfig,
  Pattern,
  PatternId,
  PatternMap,
} from '../../pattern.js';
import { FormErrors } from '../../error.js';
import { defaultFormConfig } from '../../patterns/index.js';

const FormSummary = z.object({
  component_type: z.literal('form_summary'),
  title: z.string(),
  description: z.string(),
});

const TxInput = z.object({
  component_type: z.literal('text_input'),
  id: z.string(),
  label: z.string(),
  default_value: z.string(),
  required: z.boolean(),
  page: z.union([z.number(), z.string()]),
});

const Checkbox = z.object({
  component_type: z.literal('checkbox'),
  id: z.string(),
  label: z.string(),
  default_checked: z.boolean(),
  page: z.union([z.number(), z.string()]),
});

const RadioGroupOption = z.object({
  id: z.string(),
  label: z.string(),
  name: z.string(),
  default_checked: z.boolean(),
  page: z.union([z.number(), z.string()]),
});

const RadioGroup = z.object({
  id: z.string(),
  component_type: z.literal('radio_group'),
  legend: z.string(),
  options: RadioGroupOption.array(),
  page: z.union([z.number(), z.string()]),
});

const Paragraph = z.object({
  component_type: z.literal('paragraph'),
  text: z.string(),
  page: z.union([z.number(), z.string()]),
});

const RichText = z.object({
  component_type: z.literal('rich_text'),
  text: z.string(),
  page: z.union([z.number(), z.string()]),
});

const Fieldset = z.object({
  component_type: z.literal('fieldset'),
  legend: z.string(),
  fields: z.union([TxInput, Checkbox]).array(),
  page: z.union([z.number(), z.string()]),
});

const ExtractedObject = z.object({
  raw_text: z.string(),
  form_summary: FormSummary,
  elements: z
    .union([TxInput, Checkbox, RadioGroup, Paragraph, Fieldset, RichText])
    .array(),
});

type ExtractedObject = z.infer<typeof ExtractedObject>;

export type ParsedPdf = {
  patterns: PatternMap;
  errors: {
    type: Pattern['type'];
    data: Pattern['data'];
    errors: FormErrors;
  }[];
  outputs: DocumentFieldMap; // to populate FormOutput
  root: PatternId;
  title: string;
  description: string;
};

export type FetchPdfApiResponse = (
  rawData: Uint8Array,
  url?: string
) => Promise<any>;

export const fetchPdfApiResponse: FetchPdfApiResponse = async (
  rawData: Uint8Array,
  url: string = 'https://10x-atj-doc-automation-staging.app.cloud.gov/api/v2/parse' // 'http://localhost:5000/api/v2/parse'
) => {
  return MOCK_RESPONSE;
  const base64 = await uint8ArrayToBase64(rawData);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pdf: base64,
    }),
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return await response.json();
};

export const processApiResponse = async (json: any): Promise<ParsedPdf> => {
  const extracted: ExtractedObject = ExtractedObject.parse(json.parsed_pdf);
  const rootSequence: PatternId[] = [];
  const pagePatterns: Record<PatternId, PatternId[]> = {};
  const parsedPdf: ParsedPdf = {
    patterns: {},
    errors: [],
    outputs: {},
    root: 'root',
    title: extracted.form_summary.title || 'Default Form Title',
    description:
      extracted.form_summary.description || 'Default Form Description',
  };

  const summary = processPatternData(
    defaultFormConfig,
    parsedPdf,
    'form-summary',
    {
      title: extracted.form_summary.title || 'Default Form Title',
      description:
        extracted.form_summary.description || 'Default Form Description',
    }
  );
  if (summary) {
    rootSequence.push(summary.id);
  }

  for (const element of extracted.elements) {
    const fieldsetPatterns: PatternId[] = [];
    // Add paragraph elements
    if (element.component_type === 'paragraph') {
      const paragraph = processPatternData<ParagraphPattern>(
        defaultFormConfig,
        parsedPdf,
        'paragraph',
        {
          text: element.text,
        }
      );
      if (paragraph) {
        pagePatterns[element.page] = (pagePatterns[element.page] || []).concat(
          paragraph.id
        );
      }
      continue;
    }

    if (element.component_type === 'rich_text') {
      const richText = processPatternData<RichTextPattern>(
        defaultFormConfig,
        parsedPdf,
        'rich-text',
        {
          text: element.text,
        }
      );
      if (richText) {
        pagePatterns[element.page] = (pagePatterns[element.page] || []).concat(
          richText.id
        );
      }
      continue;
    }

    if (element.component_type === 'checkbox') {
      const checkboxPattern = processPatternData<CheckboxPattern>(
        defaultFormConfig,
        parsedPdf,
        'checkbox',
        {
          label: element.label,
          defaultChecked: element.default_checked,
        }
      );
      if (checkboxPattern) {
        pagePatterns[element.page] = (pagePatterns[element.page] || []).concat(
          checkboxPattern.id
        );
        parsedPdf.outputs[checkboxPattern.id] = {
          type: 'CheckBox',
          name: element.id,
          label: element.label,
          value: false,
          required: true,
        };
      }
      continue;
    }

    if (element.component_type === 'radio_group') {
      const radioGroupPattern = processPatternData<RadioGroupPattern>(
        defaultFormConfig,
        parsedPdf,
        'radio-group',
        {
          label: element.legend,
          hint: '',
          options: element.options.map(option => ({
            id: option.id,
            label: option.label,
            name: option.name,
            defaultChecked: option.default_checked,
          })),
          required: false,
        }
      );
      if (radioGroupPattern) {
        pagePatterns[element.page] = (pagePatterns[element.page] || []).concat(
          radioGroupPattern.id
        );
        parsedPdf.outputs[radioGroupPattern.id] = {
          type: 'RadioGroup',
          name: element.id,
          label: element.legend,
          options: element.options.map(option => ({
            id: option.id,
            label: option.label,
            name: option.name,
            defaultChecked: option.default_checked,
          })),
          value: '',
          required: true,
        };
      }
      continue;
    }

    if (element.component_type === 'fieldset') {
      for (const input of element.fields) {
        if (input.component_type === 'text_input') {
          const inputPattern = processPatternData<InputPattern>(
            defaultFormConfig,
            parsedPdf,
            'input',
            {
              label: input.label,
              required: false,
              initial: '',
              maxLength: 128,
            }
          );
          if (inputPattern) {
            fieldsetPatterns.push(inputPattern.id);
            parsedPdf.outputs[inputPattern.id] = {
              type: 'TextField',
              name: input.id,
              label: input.label,
              value: '',
              maxLength: 1024,
              required: input.required,
            };
          }
        }
        if (input.component_type === 'checkbox') {
          const checkboxPattern = processPatternData<CheckboxPattern>(
            defaultFormConfig,
            parsedPdf,
            'checkbox',
            {
              label: input.label,
              defaultChecked: false,
            }
          );
          if (checkboxPattern) {
            fieldsetPatterns.push(checkboxPattern.id);
            parsedPdf.outputs[checkboxPattern.id] = {
              type: 'CheckBox',
              name: input.id,
              label: input.label,
              value: false,
              required: true,
            };
          }
        }
      }
    }

    // Add fieldset to parsedPdf.patterns and rootSequence
    if (element.component_type === 'fieldset' && fieldsetPatterns.length > 0) {
      const fieldset = processPatternData<FieldsetPattern>(
        defaultFormConfig,
        parsedPdf,
        'fieldset',
        {
          legend: element.legend,
          patterns: fieldsetPatterns,
        }
      );
      if (fieldset) {
        pagePatterns[element.page] = (pagePatterns[element.page] || []).concat(
          fieldset.id
        );
      }
    }
  }

  // Create a pattern for the single, first page.
  const pages: PatternId[] = Object.entries(pagePatterns)
    .map(([page, patterns], idx) => {
      const pagePattern = processPatternData<PagePattern>(
        defaultFormConfig,
        parsedPdf,
        'page',
        {
          title: `${page}`,
          patterns,
        },
        undefined,
        idx
      );
      return pagePattern?.id;
    })
    .filter(page => page !== undefined) as PatternId[];

  // Assign the page to the root page set.
  const rootPattern = processPatternData<PageSetPattern>(
    defaultFormConfig,
    parsedPdf,
    'page-set',
    {
      pages,
    },
    'root'
  );
  if (rootPattern) {
    parsedPdf.patterns['root'] = rootPattern;
  }
  return parsedPdf;
};

const processPatternData = <T extends Pattern>(
  config: FormConfig,
  parsedPdf: ParsedPdf,
  patternType: T['type'],
  patternData: T['data'],
  patternId?: PatternId,
  page?: number
) => {
  const result = createPattern<T>(config, patternType, patternData, patternId);
  if (!result.success) {
    parsedPdf.errors.push({
      type: patternType,
      data: patternData,
      errors: result.error,
    });
    return;
  }
  parsedPdf.patterns[result.data.id] = result.data;
  return result.data;
};

/**
 * There are some parsing api changes necessary to handle the presidential
 * pardon form well.
 * To address the issues, this response was generated with two follow-up
 * prompts.
 * A similar process will be added to the API, but for now, we'll use this mock
 * response for demo purposes.
 */
const MOCK_RESPONSE = {
  message: 'PDF parsed successfully',
  parsed_pdf: {
    raw_text: '',
    form_summary: {
      component_type: 'form_summary',
      title: 'Application for Pardon After Completion of Sentence',
      description:
        "This form is for people who want to ask the President for a pardon after they have finished their sentence. A pardon can help by giving back rights like voting and making it easier to get jobs or housing. To apply, you need to have been out of prison for at least five years or have been sentenced five years ago if you didn't go to prison. The form asks for details about your life, your conviction, and why you want a pardon. You might need some documents like your judgment or case report to complete the application.",
    },
    elements: [
      {
        component_type: 'rich_text',
        text: '<h2>Introduction to the Pardon Application Process</h2><p>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</p><p>Application for Pardon After Completion of Sentence</p><h3>What Is a Pardon and How Can It Help You?</h3><p>Pardon is asking forgiveness from the President.</p><b>Pardon CAN:</b><ul><li>Restore civil liberties, like the right to vote, or sit on a jury</li><li>Lift barriers to licensing, employment, housing, or education</li></ul>',
        style: 'normal',
        page: 'Pardon Intro',
      },
      {
        component_type: 'rich_text',
        text: '<b>Pardon CANNOT:</b><ul><li>Erase a conviction</li><li>Expunge a conviction</li></ul><b>To apply, you should:</b><ul><li>Have a conviction under federal law, D.C. Code, or Uniform Code of Military Justice</li><li>Have been released from prison or home/community detention at least five years ago OR Have been sentenced at least five years ago, if you were not given a prison term</li><li>Live in the U.S. or its territories</li></ul><p>If you are still serving your sentence, use the commutation application form, available here: justice.gov/pardon/apply-commutation</p>',
        style: 'normal',
        page: 'Pardon Limitations',
      },
      {
        component_type: 'rich_text',
        text: '<h2>How to Begin the Application Process</h2><p>Filling out and submitting the application is the first step in a lengthy process. You will be asked to provide details about yourself, your reasons for seeking pardon, your current activities, challenges you may be facing because of your conviction, information about your conviction and other criminal history, if any, and letters of support.</p><p>It is not required, but it may be helpful to gather the following documents, if available, before you start:</p><ol><li>Presentence investigation report This report is prepared by the U.S. Probation Office to help the court with sentencing.</li></ol><ol><li>Judgment This document shows what sentence the court gave you.</li></ol>',
        style: 'normal',
        page: 'Application Start',
      },
      {
        component_type: 'rich_text',
        text: '<ol><li>Statement of reasons This document gives the court’s reasons for the sentence (not applicable in D.C. Code or military cases).</li></ol><ol><li>Indictment or Information These documents list the charges against you.</li></ol><ol><li>Case docket report The docket lists all the events in the case.</li></ol><h2>Where to Find Documents Related to Your Conviction</h2><p>You may be able to get the judgment, indictment, information, and case docket report online:</p>',
        style: 'normal',
        page: 'Document Gathering',
      },
      {
        component_type: 'rich_text',
        text: '<ul><li>Federal cases: PACER (has fees): uscourts.gov/court-records/find-case-pacer</li></ul><ul><li>D.C. cases: dccourts.gov/superior-court/cases-online</li></ul><p>For documents that aren’t available online, you can contact or go to the court clerk’s office:</p><ul><li>Federal court clerk’s offices: uscourts.gov/about-federal-courts/federal-courts-public/court-website-links</li></ul><ul><li>D.C. Superior Court: dccourts.gov/superior-court/criminal-division</li></ul>',
        style: 'normal',
        page: 'Document Access',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Pardon Application Process Information</h2><p>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</p><p>When will the Office of the Pardon Attorney (PARDON) contact you?</p><p>The pardon application process can take months or years to complete. We ask that you keep your contact information with us up-to-date, so that we can reach you when needed. Until the notification of the President’s final decision, your application remains “pending” or open. Messages from PARDON during the process DO NOT predict what final decision the President will make. No outcome is guaranteed. Common situations when we will contact you include:</p><p>Confirmation Letter: We will send an email or letter confirming your application has been received.</p><p>Follow-Up Letters: We may send emails or letters asking for more information or updates.</p><p>Background Investigation: We will let you know if a background investigation has been started.</p><p>Notification of Final Decision: We will let you know whether the President has granted or denied pardon.</p>',
        style: 'normal',
        page: 'Pardon Process',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Helpful Tips for Completing the Application</h2><b>HELPFUL TIPS</b><ul><li>This application requests information that will help us get a better picture of you and your life. All questions are important. Answer all questions to the best of your knowledge and ability and give as much detail as you can.</li><li>The application requires a large amount of personal information that may require research and collecting documents from years or decades ago. You may need several sessions to complete the application.</li><li>To help us process your application more quickly, if an answer does not apply to you, write “Not Applicable.”</li><li>Sending your application as a PDF by email will help us process your application more quickly.</li><li>If you mail in the application, stapling, gluing, or taping any part will slow down processing.</li><li>If you need more space, you can add additional pages or documents.</li><li>If there is any information you feel would make your application stronger, but you did not see a space to talk about it, please include it in additional pages. You can tell us about achievements, like physical fitness training or accomplishments; participation in personal growth, like counseling, therapy, or meditation; or other ways you have spent your time that tell us about who you are today.</li></ul>',
        style: 'normal',
        page: 'Application Tips',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Introduction and Table of Contents</h2><p>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</p><p>Table of Contents</p><p>A. Background Information</p><p>We need to know who is applying for pardon, to confirm your identity, and to be sure any background investigation is accurate.</p>',
        style: 'normal',
        page: 'Intro & Contents',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Reasons for Seeking Pardon</h2><p>B. Reasons for Seeking Pardon</p><p>We need to understand how your conviction has affected your life and what you hope pardon will change or improve.</p>',
        style: 'normal',
        page: 'Pardon Reasons',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Additional Information About Your Life Since Your Conviction</h2><p>Additional Information About Your Life Since Your Conviction (Parts C-I):</p><p>We need the questions in sections C-I (pages 9-14) to help us get a better picture of your life since your conviction, including your successes and the challenges you may have faced.</p><p>C. Community Activities</p><p>D. Educational and Licensing Opportunities</p>',
        style: 'normal',
        page: 'Life Post-Conviction',
      },
      {
        component_type: 'rich_text',
        text: '<p>E. Places Lived</p><p>F. Military Service</p><p>G. Job History</p><p>H. Sobriety and Substance Use</p><p>I. Financial Information</p>',
        style: 'normal',
        page: 'Residency & Service',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Case Background and Other Criminal History</h2><p>J. Case Background and Other Criminal History</p><p>We need to make sure we have the correct case, better understand your offense conduct, and give you an opportunity to explain any other criminal history that may appear in a background investigation.</p>',
        style: 'normal',
        page: 'Case & History',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Certification and Personal Oath</h2><p>K. Certification and Personal Oath</p><p>We need your signature to know that you are submitting the pardon application willingly and that you have answered the questions accurately, to the best of your ability.</p>',
        style: 'normal',
        page: 'Certification & Oath',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Authorization for Release of Information</h2><p>L. Authorization for Release of Information</p><p>The authorization lets us and any investigators we work with access information and documentation about your life. If we need information about medical or mental health history, we will ask you to complete a separate authorization.</p>',
        style: 'normal',
        page: 'Info Release',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Letters of Support</h2><p>M. Letters of Support</p><p>We need to know how you interact with your community, who you are now, and what your life looks like since your conviction. We need at least three letters. If you give us more than three letters, let us know which three will be your primary references. Primary references cannot be related to you by blood or marriage and must be willing to be interviewed during a background investigation.</p>',
        style: 'normal',
        page: 'Support Letters',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Application Checklist</h2><p>N. Application Checklist</p><p>This checklist will help you review your application to make sure it is complete before you send it in, tells you where to submit the application, and reminds you to keep your contact information up-to-date so we can contact you throughout the pardon application process.</p>',
        style: 'normal',
        page: 'Checklist',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Information about the Office of the Pardon Attorney and your rights.</h2><p>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</p><h3>Know Your Rights and How Your Information Will be Used</h3><b>Who is collecting this information and what are my rights?</b><p>The Office of the Pardon Attorney collects your information to review and make recommendations to the President on pardon applications. The Office is part of the Department of Justice, which is a federal government agency. You have the right not to provide information to us. If you do not answer some of the questions, however, we cannot guarantee that we will be able to continue working on your application.</p><b>How will my information be used under the Privacy Act?</b><p>The principal purpose for collecting this information is to enable the Office of the Pardon Attorney to process and evaluate your request for pardon after completion of sentence. The routine uses which may be made of this information include provision of data to the President and his staff, other governmental entities, and the public. The full list of routine uses for this correspondence can be found in the System of Records Notice titled, “Privacy Act of 1974; System of Records,” published in Federal Register, September 15, 2011, Vol. 76, No. 179, at pages 57078 through 57080; as amended by “Privacy Act of 1974; System of Records,” published in the Federal Register, May 25, 2017, Vol. 82, No. 100, at page 24161, and at the U.S. Department of Justice, Office of Privacy and Civil Liberties’ website.</p>',
        style: 'normal',
        page: 'Pardon Rights',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Additional information about the authority and publication of your information.</h2><p>The Office of the Pardon Attorney has authority to collect this information under the United States Constitution, Article II, Section 2 (the pardon clause); Orders of the Attorney General Nos. 1798-93, 58 Fed. Reg. 53658 and 53659 (1993), 2317-2000, 65 Fed. Reg. 48381 (2000), and 2323-2000, 65 Fed. Reg. 58223 and 58224 (2000), codified in 28 C.F.R. §§ 1.1 et seq. (the rules governing petitions for pardon after completion of sentence); and Order of the Attorney General No. 1012-83, 48 Fed. Reg. 22290 (1983), as codified in 28 C.F.R. §§ 0.35 and 0.36 (the authority of the Office of the Pardon Attorney).</p><b>Can the government publish my information?</b><p>If you are granted or denied pardon by the President, your name will be released, including on our website or in response to public information requests, in accordance with our Freedom of Information Act obligations. Non-public documents, such as this petition and supporting documents, the presentence investigation report, the results of any federal background investigation, and the recommendation of the Department of Justice, are not generally available under the Freedom of Information and Privacy Acts. However, the Pardon Attorney may disclose the contents of pardon files in the possession of the Department of Justice when the disclosure is required by law or the ends of justice. Additionally, this office would confirm that a specific individual has applied for or was granted or denied pardon.</p><p>The President and his immediate staff are not subject to the constraints of the Freedom of Information and Privacy Acts. Accordingly, while pardon-related documents in the possession of the White House traditionally have not been made public, they may be legally disclosed at the discretion of the President. In addition, pardon-related documents retained by the White House at the end of a presidential administration will become part of the President’s official library, where they become subject to the disclosure provisions of the Presidential Records Act.</p><p>Answer questions as accurately and as fully as you can, to the best of your knowledge. Making any intentionally false statements of material facts may provide a reason for denying your petition. In addition, the knowing and willful falsification of a document submitted to the government may subject you to criminal punishment, including up to five years’ imprisonment and a $250,000 fine. See 18 U.S.C. §§ 1001 and 3571.</p>',
        style: 'normal',
        page: 'Info Authority',
      },
      {
        component_type: 'rich_text',
        text: '<p>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</p><h3>Public Burden Statement</h3><p>This collection meets the requirements of 44 U.S.C. <br>3507, as amended by the Paperwork Reduction Act of 1995. We estimate that it will take 180 minutes to read the instructions, gather the relevant materials, and answer questions on the form. Send comments regarding the burden estimate or any other aspect of this collection of information, including suggestions for reducing this burden, to Attn: Office of the Pardon Attorney, U.S. Department of Justice, Attn: OMB Number XXXX-XXXX, RFK Building, 950 Pennsylvania Avenue, N.W., Washington, D.C. 20530. The OMB clearance number, XXXX-XXXX, is currently valid. PARDON may not collect this information, and you are not required to respond, unless this number is displayed.</p><i>Note: Nothing in this application or instructions is legal advice.</i>',
        style: 'normal',
        page: 'DOJ Info',
      },
      {
        component_type: 'rich_text',
        text: '<p>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</p><h2>Background Information</h2><h3>Applicant information</h3>',
        style: 'normal',
        page: 'DOJ Office',
      },
      {
        component_type: 'fieldset',
        legend: 'Full name',
        fields: [
          {
            component_type: 'text_input',
            id: 'First name',
            label: 'First name',
            default_value: '',
            required: false,
            page: 'DOJ Office',
          },
          {
            component_type: 'text_input',
            id: 'Middle name if you have one',
            label: 'Middle name (if you have one)',
            default_value: '',
            required: false,
            page: 'DOJ Office',
          },
          {
            component_type: 'text_input',
            id: 'Last name',
            label: 'Last name',
            default_value: '',
            required: false,
            page: 'DOJ Office',
          },
        ],
        page: 'DOJ Office',
      },
      {
        component_type: 'fieldset',
        legend: 'If different, full legal name at time of conviction',
        fields: [
          {
            component_type: 'text_input',
            id: 'First name_2',
            label: 'First name',
            default_value: '',
            required: false,
            page: 'DOJ Office',
          },
          {
            component_type: 'text_input',
            id: 'Middle Name if you have one',
            label: 'Middle Name (if you have one)',
            default_value: '',
            required: false,
            page: 'DOJ Office',
          },
          {
            component_type: 'text_input',
            id: 'Last name_2',
            label: 'Last name',
            default_value: '',
            required: false,
            page: 'DOJ Office',
          },
        ],
        page: 'DOJ Office',
      },
      {
        component_type: 'rich_text',
        text: '<h3>Additional personal information</h3>',
        style: 'normal',
        page: 'Personal Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Other names',
        fields: [
          {
            component_type: 'text_input',
            id: 'Other names married maiden aliases etc',
            label: 'Other names (married, maiden, aliases, etc.)',
            default_value: '',
            required: false,
            page: 'Personal Info',
          },
        ],
        page: 'Personal Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Social security number',
        fields: [
          {
            component_type: 'text_input',
            id: 'Social security number',
            label: 'Social security number',
            default_value: '',
            required: false,
            page: 'Personal Info',
          },
        ],
        page: 'Personal Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Date of birth',
        fields: [
          {
            component_type: 'text_input',
            id: 'Date of birth Month Day Year',
            label: 'Date of birth (Month, Day, Year)',
            default_value: '',
            required: false,
            page: 'Personal Info',
          },
        ],
        page: 'Personal Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Place of birth',
        fields: [
          {
            component_type: 'text_input',
            id: 'Country where you',
            label: 'Country where you were born',
            default_value: '',
            required: false,
            page: 'Personal Info',
          },
          {
            component_type: 'text_input',
            id: 'City and state where you',
            label: 'City and state where you were born',
            default_value: '',
            required: false,
            page: 'Personal Info',
          },
        ],
        page: 'Personal Info',
      },
      {
        component_type: 'rich_text',
        text: '<h3>Family and citizenship information</h3>',
        style: 'normal',
        page: 'Family & Citizenship',
      },
      {
        component_type: 'fieldset',
        legend: 'Parent #1’s full name',
        fields: [
          {
            component_type: 'text_input',
            id: 'Parents 1s full name including maiden name',
            label: 'Parent #1’s full name (including maiden name)',
            default_value: '',
            required: false,
            page: 'Family & Citizenship',
          },
        ],
        page: 'Family & Citizenship',
      },
      {
        component_type: 'fieldset',
        legend: 'Parent #2’s full name',
        fields: [
          {
            component_type: 'text_input',
            id: 'Parents 2s full name including maiden name',
            label: 'Parent #2’s full name (including maiden name)',
            default_value: '',
            required: false,
            page: 'Family & Citizenship',
          },
        ],
        page: 'Family & Citizenship',
      },
      {
        component_type: 'fieldset',
        legend: 'Citizenship',
        fields: [
          {
            component_type: 'checkbox',
            id: 'Citizenship',
            label: 'U.S. citizen by birth',
            default_checked: false,
            page: 'Family & Citizenship',
          },
          {
            component_type: 'checkbox',
            id: 'Citizenship',
            label: 'U.S. naturalized citizen',
            default_checked: false,
            page: 'Family & Citizenship',
          },
          {
            component_type: 'checkbox',
            id: 'Citizenship',
            label: 'Other nationality',
            default_checked: false,
            page: 'Family & Citizenship',
          },
        ],
        page: 'Family & Citizenship',
      },
      {
        component_type: 'rich_text',
        text: '<h3>Contact information</h3>',
        style: 'normal',
        page: 'Contact Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Address',
        fields: [
          {
            component_type: 'text_input',
            id: 'Street address',
            label: 'Street address',
            default_value: '',
            required: false,
            page: 'Contact Info',
          },
          {
            component_type: 'text_input',
            id: 'ApartmentUnit',
            label: 'Apartment/Unit',
            default_value: '',
            required: false,
            page: 'Contact Info',
          },
          {
            component_type: 'text_input',
            id: 'City State',
            label: 'City, State',
            default_value: '',
            required: false,
            page: 'Contact Info',
          },
          {
            component_type: 'text_input',
            id: 'Zip code',
            label: 'Zip code',
            default_value: '',
            required: false,
            page: 'Contact Info',
          },
        ],
        page: 'Contact Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Contact details',
        fields: [
          {
            component_type: 'text_input',
            id: 'Your email address or email of a trusted person',
            label: 'Your email address or email of a trusted person',
            default_value: '',
            required: false,
            page: 'Contact Info',
          },
          {
            component_type: 'text_input',
            id: 'Phone number',
            label: 'Phone number',
            default_value: '',
            required: false,
            page: 'Contact Info',
          },
        ],
        page: 'Contact Info',
      },
      {
        component_type: 'rich_text',
        text: '<h3>Attorney and previous applications</h3>',
        style: 'normal',
        page: 'Legal Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Attorney information',
        fields: [
          {
            component_type: 'text_input',
            id: 'Attorneys name',
            label: 'Attorney’s name',
            default_value: '',
            required: false,
            page: 'Legal Info',
          },
          {
            component_type: 'text_input',
            id: 'Attorneys email address and phone number',
            label: 'Attorney’s email address and phone number',
            default_value: '',
            required: false,
            page: 'Legal Info',
          },
        ],
        page: 'Legal Info',
      },
      {
        component_type: 'rich_text',
        text: '<h3>Previous applications</h3>',
        style: 'normal',
        page: 'Legal Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Have you applied for federal commutation or pardon before?',
        fields: [
          {
            component_type: 'checkbox',
            id: 'Have you applied for',
            label: 'Yes',
            default_checked: false,
            page: 'Legal Info',
          },
          {
            component_type: 'checkbox',
            id: 'Have you applied for',
            label: 'No',
            default_checked: false,
            page: 'Legal Info',
          },
        ],
        page: 'Legal Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Application details',
        fields: [
          {
            component_type: 'text_input',
            id: 'Date applied monthyear',
            label: 'Date applied (month/year)',
            default_value: '',
            required: false,
            page: 'Legal Info',
          },
          {
            component_type: 'text_input',
            id: 'Date of decision monthyear',
            label: 'Date of decision (month/year)',
            default_value: '',
            required: false,
            page: 'Legal Info',
          },
        ],
        page: 'Legal Info',
      },
      {
        component_type: 'rich_text',
        text: '<i>Page 6 of 24</i>',
        style: 'normal',
        page: 'Legal Info',
      },
      {
        component_type: 'rich_text',
        text: '<p>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</p><i>Page 7 of 24</i><h2>Gender and Race Information</h2><p>This information is for statistical data collection purposes:</p>',
        style: 'normal',
        page: 'Demographics Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Are you Hispanic or Latino?',
        fields: [
          {
            component_type: 'checkbox',
            id: 'Latino',
            label: 'Yes',
            default_checked: false,
            page: 'Demographics Info',
          },
          {
            component_type: 'checkbox',
            id: 'Latino',
            label: 'No',
            default_checked: false,
            page: 'Demographics Info',
          },
        ],
        page: 'Demographics Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Race (select all that apply):',
        fields: [
          {
            component_type: 'checkbox',
            id: 'Alaska Native or American',
            label: 'Alaska Native or American Indian',
            default_checked: false,
            page: 'Demographics Info',
          },
          {
            component_type: 'checkbox',
            id: 'Black or African American',
            label: 'Black or African American',
            default_checked: false,
            page: 'Demographics Info',
          },
          {
            component_type: 'checkbox',
            id: 'White',
            label: 'White',
            default_checked: false,
            page: 'Demographics Info',
          },
          {
            component_type: 'checkbox',
            id: 'Asian',
            label: 'Asian',
            default_checked: false,
            page: 'Demographics Info',
          },
          {
            component_type: 'checkbox',
            id: 'Native Hawaiian or',
            label: 'Native Hawaiian or Other Pacific Islander',
            default_checked: false,
            page: 'Demographics Info',
          },
          {
            component_type: 'checkbox',
            id: 'Other',
            label: 'Other',
            default_checked: false,
            page: 'Demographics Info',
          },
        ],
        page: 'Demographics Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Gender identity',
        fields: [
          {
            component_type: 'checkbox',
            id: 'Gender identity',
            label: 'Female',
            default_checked: false,
            page: 'Demographics Info',
          },
          {
            component_type: 'checkbox',
            id: 'Gender identity',
            label: 'Male',
            default_checked: false,
            page: 'Demographics Info',
          },
          {
            component_type: 'checkbox',
            id: 'Gender identity',
            label: 'Other',
            default_checked: false,
            page: 'Demographics Info',
          },
        ],
        page: 'Demographics Info',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Family Information</h2><p>For this section, it would be helpful to have dates for:</p><ul><li>Your marriage (if applicable)</li></ul><ul><li>Your divorce (if applicable)</li></ul><ul><li>Your children’s birth dates (if applicable)</li></ul>',
        style: 'normal',
        page: 'Family Details',
      },
      {
        component_type: 'fieldset',
        legend: 'Current marital status',
        fields: [
          {
            component_type: 'checkbox',
            id: 'Civil uniondomestic partnership',
            label: 'Civil union/domestic partnership',
            default_checked: false,
            page: 'Family Details',
          },
          {
            component_type: 'checkbox',
            id: 'Divorced',
            label: 'Divorced',
            default_checked: false,
            page: 'Family Details',
          },
          {
            component_type: 'checkbox',
            id: 'Married',
            label: 'Married',
            default_checked: false,
            page: 'Family Details',
          },
          {
            component_type: 'checkbox',
            id: 'Never Married',
            label: 'Never Married',
            default_checked: false,
            page: 'Family Details',
          },
          {
            component_type: 'checkbox',
            id: 'Separated',
            label: 'Separated',
            default_checked: false,
            page: 'Family Details',
          },
          {
            component_type: 'checkbox',
            id: 'Widowed',
            label: 'Widowed',
            default_checked: false,
            page: 'Family Details',
          },
        ],
        page: 'Family Details',
      },
      {
        component_type: 'fieldset',
        legend: 'Current spouse / partner information, if applicable:',
        fields: [
          {
            component_type: 'text_input',
            id: 'Spouse  partner name',
            label: 'Spouse / partner name',
            default_value: '',
            required: false,
            page: 'Spouse Info',
          },
          {
            component_type: 'text_input',
            id: 'Date of marriage or civil uniondomestic partnership',
            label: 'Date of marriage or civil union/domestic partnership',
            default_value: '',
            required: false,
            page: 'Spouse Info',
          },
          {
            component_type: 'text_input',
            id: 'Place of marriage or civil uniondomestic partnership',
            label: 'Place of marriage or civil union/domestic partnership',
            default_value: '',
            required: false,
            page: 'Spouse Info',
          },
        ],
        page: 'Spouse Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Child or dependent information, if applicable:',
        fields: [
          {
            component_type: 'text_input',
            id: 'Full name of child or dependentRow1',
            label: 'Full name of child or dependent',
            default_value: '',
            required: false,
            page: 'Child Info',
          },
          {
            component_type: 'text_input',
            id: 'Date of birthRow1',
            label: 'Date of birth',
            default_value: '',
            required: false,
            page: 'Child Info',
          },
          {
            component_type: 'text_input',
            id: 'Names of other parentsRow1',
            label: 'Name(s) of other parent(s)',
            default_value: '',
            required: false,
            page: 'Child Info',
          },
          {
            component_type: 'text_input',
            id: 'Do you have custody YNRow1',
            label: 'Do you have custody? (Y/N)',
            default_value: '',
            required: false,
            page: 'Child Info',
          },
          {
            component_type: 'text_input',
            id: 'Full name of child or dependentRow2',
            label: 'Full name of child or dependent',
            default_value: '',
            required: false,
            page: 'Child Info',
          },
          {
            component_type: 'text_input',
            id: 'Date of birthRow2',
            label: 'Date of birth',
            default_value: '',
            required: false,
            page: 'Child Info',
          },
          {
            component_type: 'text_input',
            id: 'Names of other parentsRow2',
            label: 'Name(s) of other parent(s)',
            default_value: '',
            required: false,
            page: 'Child Info',
          },
          {
            component_type: 'text_input',
            id: 'Do you have custody YNRow2',
            label: 'Do you have custody? (Y/N)',
            default_value: '',
            required: false,
            page: 'Child Info',
          },
        ],
        page: 'Child Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Former spouse or partner information, if applicable:',
        fields: [
          {
            component_type: 'text_input',
            id: 'Former spouse or partner name',
            label: 'Former spouse or partner name',
            default_value: '',
            required: false,
            page: 'Former Partner Info',
          },
          {
            component_type: 'text_input',
            id: 'Phone number_2',
            label: 'Phone number',
            default_value: '',
            required: false,
            page: 'Former Partner Info',
          },
          {
            component_type: 'text_input',
            id: 'Date of marriage or civil uniondomestic partnership_2',
            label: 'Date of marriage or civil union/domestic partnership',
            default_value: '',
            required: false,
            page: 'Former Partner Info',
          },
          {
            component_type: 'text_input',
            id: 'Date of divorce',
            label: 'Date of divorce',
            default_value: '',
            required: false,
            page: 'Former Partner Info',
          },
          {
            component_type: 'text_input',
            id: 'Place of marriage or civil uniondomestic partnership_2',
            label: 'Place of marriage or civil union/domestic partnership',
            default_value: '',
            required: false,
            page: 'Former Partner Info',
          },
          {
            component_type: 'text_input',
            id: 'Place of divorce',
            label: 'Place of divorce',
            default_value: '',
            required: false,
            page: 'Former Partner Info',
          },
        ],
        page: 'Former Partner Info',
      },
      {
        component_type: 'checkbox',
        id: 'Check here if you are attaching additional pages for your response to any questions in this section',
        label:
          'Check here if you are attaching additional pages for your response to any questions in this section.',
        default_checked: false,
        page: 'Former Partner Info',
      },
      {
        component_type: 'rich_text',
        text: '<i>Add the name of the form section to the top of each page you attach.</i>',
        style: 'normal',
        page: 'Former Partner Info',
      },
      {
        component_type: 'rich_text',
        text: '<p>This page contains information and input fields related to your reasons for seeking a pardon.</p><p>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</p><h2>Reasons for Seeking Pardon</h2><p>What are your reasons for seeking pardon? The more specific you can be, the better. Use the space below and/or attach additional pages.</p>',
        style: 'normal',
        page: 'Pardon Reasons Details',
      },
      {
        component_type: 'fieldset',
        legend: 'Your reasons for seeking pardon',
        fields: [
          {
            component_type: 'text_input',
            id: 'Your reasons for seeking pardon',
            label: 'Your reasons for seeking pardon',
            default_value: '',
            required: false,
            page: 'Pardon Reasons Details',
          },
        ],
        page: 'Pardon Reasons Details',
      },
      {
        component_type: 'rich_text',
        text: '<p>You may want to include:</p><ul><li>How your life would be different if granted pardon</li></ul><ul><li>Challenges that you have faced as a result of your conviction</li></ul><p>If you have ever been denied a job, license, or other opportunity because of your conviction, attaching denial letters or other related documents will help us with reviewing your application.</p>',
        style: 'normal',
        page: 'Pardon Reasons Details',
      },
      {
        component_type: 'checkbox',
        id: 'Check here if you are attaching additional pages for your response to any questions in this section_2',
        label:
          'Check here if you are attaching additional pages for your response to any questions in this section.',
        default_checked: false,
        page: 'Pardon Reasons Details',
      },
      {
        component_type: 'rich_text',
        text: '<i>Add the name of the form section to the top of each page you attach.</i><i>Page 8 of 24</i>',
        style: 'normal',
        page: 'Pardon Reasons Details',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Community Activities and Involvement</h2><i>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</i><h2>Community Activities</h2><p>Share how you have been involved in your community since your conviction. “Community” can include family, neighborhood, city, prison community, or organizations and associations. If you have more than three activities, attach additional pages. Some examples are:</p><ul><li>Assisting in extracurricular and education-related activities of children and grandchildren</li></ul><ul><li>Providing support to community members, such as neighbors and family members</li></ul><ul><li>Providing care to an aging relative</li></ul><ul><li>Service in or through a civic or religious organization or a professional association</li></ul><ul><li>Involvement in the prison community, including as tutor, mentor, or suicide watch companion</li></ul>',
        style: 'normal',
        page: 'Community Involvement',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Activity Details</h2>',
        style: 'normal',
        page: 'Activity Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Activity Details',
        fields: [
          {
            component_type: 'text_input',
            id: 'Description of activityRow1',
            label: 'Description of activity',
            default_value: '',
            required: false,
            page: 'Activity Info',
          },
          {
            component_type: 'text_input',
            id: 'Approximate start and end dates year to yearRow1',
            label: 'Approximate start and end dates (year to year)',
            default_value: '',
            required: false,
            page: 'Activity Info',
          },
          {
            component_type: 'text_input',
            id: 'Description of activityRow2',
            label: 'Description of activity',
            default_value: '',
            required: false,
            page: 'Activity Info',
          },
          {
            component_type: 'text_input',
            id: 'Approximate start and end dates year to yearRow2',
            label: 'Approximate start and end dates (year to year)',
            default_value: '',
            required: false,
            page: 'Activity Info',
          },
          {
            component_type: 'text_input',
            id: 'Description of activityRow3',
            label: 'Description of activity',
            default_value: '',
            required: false,
            page: 'Activity Info',
          },
          {
            component_type: 'text_input',
            id: 'Approximate start and end dates year to yearRow3',
            label: 'Approximate start and end dates (year to year)',
            default_value: '',
            required: false,
            page: 'Activity Info',
          },
        ],
        page: 'Activity Info',
      },
      {
        component_type: 'rich_text',
        text: '<h2>References and Additional Information</h2>',
        style: 'normal',
        page: 'References Info',
      },
      {
        component_type: 'fieldset',
        legend: 'References',
        fields: [
          {
            component_type: 'text_input',
            id: 'NamesRow1',
            label: 'Name(s)',
            default_value: '',
            required: false,
            page: 'References Info',
          },
          {
            component_type: 'text_input',
            id: 'Contact informationRow1',
            label: 'Contact information',
            default_value: '',
            required: false,
            page: 'References Info',
          },
        ],
        page: 'References Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Additional Information',
        fields: [
          {
            component_type: 'text_input',
            id: 'Reasons for engaging in community activities or inability to participate',
            label:
              'Is there anything you would like us to know about your reasons for engaging in community activities? If you have been unable to participate in these activities, you can let us know why here.',
            default_value: '',
            required: false,
            page: 'References Info',
          },
        ],
        page: 'References Info',
      },
      {
        component_type: 'checkbox',
        id: 'Check here if you are attaching additional pages for your response to any questions in this section_3',
        label:
          'Check here if you are attaching additional pages for your response to any questions in this section.',
        default_checked: false,
        page: 'References Info',
      },
      {
        component_type: 'rich_text',
        text: '<i>Add the name of the form section to the top of each page you attach.</i><i>Page 9 of 24</i>',
        style: 'normal',
        page: 'References Info',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Educational and Licensing Opportunities</h2><p>Tell us about any educational or licensing opportunities you have had. These can be programs you have started or completed, including courses you completed and licenses you earned while incarcerated. Some examples are:</p><ul><li>College correspondence courses</li><li>Associate, bachelor, master programs</li><li>Department of Labor courses</li><li>Certificate programs</li><li>Vocational training</li><li>Commercial driver’s license (CDL) courses</li><li>Licenses: cosmetology, real estate, nursing, teaching, welding, electrician, or other</li></ul><i>If you need more space, attach additional pages.</i>',
        style: 'normal',
        page: 'Education & Licensing',
      },
      {
        component_type: 'fieldset',
        legend: 'School or program information',
        fields: [
          {
            component_type: 'text_input',
            id: 'School or program nameRow1',
            label: 'School or program name',
            default_value: '',
            required: false,
            page: 'Education & Licensing',
          },
          {
            component_type: 'text_input',
            id: 'Topic or subject studied and Degree or certification receivedRow1',
            label:
              'Topic or subject studied and Degree or certification received',
            default_value: '',
            required: false,
            page: 'Education & Licensing',
          },
          {
            component_type: 'text_input',
            id: 'Approximate dates attended monthyear to monthyearRow1',
            label: 'Approximate dates attended (month/year to month/year)',
            default_value: '',
            required: false,
            page: 'Education & Licensing',
          },
          {
            component_type: 'text_input',
            id: 'School or program nameRow2',
            label: 'School or program name',
            default_value: '',
            required: false,
            page: 'Education & Licensing',
          },
          {
            component_type: 'text_input',
            id: 'Topic or subject studied and Degree or certification receivedRow2',
            label:
              'Topic or subject studied and Degree or certification received',
            default_value: '',
            required: false,
            page: 'Education & Licensing',
          },
          {
            component_type: 'text_input',
            id: 'Approximate dates attended monthyear to monthyearRow2',
            label: 'Approximate dates attended (month/year to month/year)',
            default_value: '',
            required: false,
            page: 'Education & Licensing',
          },
        ],
        page: 'Education & Licensing',
      },
      {
        component_type: 'rich_text',
        text: '<h2>License Information</h2>',
        style: 'normal',
        page: 'Licenses',
      },
      {
        component_type: 'fieldset',
        legend: 'License information',
        fields: [
          {
            component_type: 'text_input',
            id: 'License TypeRow1',
            label: 'License Type',
            default_value: '',
            required: false,
            page: 'Licenses',
          },
          {
            component_type: 'text_input',
            id: 'Approximate date issued yearRow1',
            label: 'Approximate date issued (year)',
            default_value: '',
            required: false,
            page: 'Licenses',
          },
          {
            component_type: 'text_input',
            id: 'License TypeRow2',
            label: 'License Type',
            default_value: '',
            required: false,
            page: 'Licenses',
          },
          {
            component_type: 'text_input',
            id: 'Approximate date issued yearRow2',
            label: 'Approximate date issued (year)',
            default_value: '',
            required: false,
            page: 'Licenses',
          },
        ],
        page: 'Licenses',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Denial Details</h2><p>We recognize that people with a criminal record may have difficulty getting into educational programs or receiving licenses. If that applies to you, provide details here. If you have them, you may attach any denial or decision letters from licensing officials or related documents.</p>',
        style: 'normal',
        page: 'Denial Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Denial details',
        fields: [
          {
            component_type: 'text_input',
            id: 'School or program name or license typeRow1',
            label: 'School or program name or license type',
            default_value: '',
            required: false,
            page: 'Denial Info',
          },
          {
            component_type: 'text_input',
            id: 'DetailsRow1',
            label: 'Details',
            default_value: '',
            required: false,
            page: 'Denial Info',
          },
          {
            component_type: 'text_input',
            id: 'Approximate date of denial or when informed not eligible yearRow1',
            label:
              'Approximate date of denial or when informed not eligible (year)',
            default_value: '',
            required: false,
            page: 'Denial Info',
          },
          {
            component_type: 'text_input',
            id: 'School or program name or license typeRow2',
            label: 'School or program name or license type',
            default_value: '',
            required: false,
            page: 'Denial Info',
          },
          {
            component_type: 'text_input',
            id: 'DetailsRow2',
            label: 'Details',
            default_value: '',
            required: false,
            page: 'Denial Info',
          },
          {
            component_type: 'text_input',
            id: 'Approximate date of denial or when informed not eligible yearRow2',
            label:
              'Approximate date of denial or when informed not eligible (year)',
            default_value: '',
            required: false,
            page: 'Denial Info',
          },
        ],
        page: 'Denial Info',
      },
      {
        component_type: 'checkbox',
        id: 'Check here if you are attaching additional pages for your response to any questions in this section_4',
        label:
          'Check here if you are attaching additional pages for your response to any questions in this section.',
        default_checked: false,
        page: 'Denial Info',
      },
      {
        component_type: 'rich_text',
        text: '<i>Add the name of the form section to the top of each page you attach.</i><p>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</p>',
        style: 'normal',
        page: 'Denial Info',
      },
      {
        component_type: 'rich_text',
        text: '<p>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</p><h2>Places Lived</h2><p>Tell us where you have lived in the last three years, with addresses and approximate dates. We already have your current address from your background information.</p><ul><li>Do not use P.O. Boxes.</li><li>Provide apartment/unit numbers.</li><li>Do not leave any gaps in dates.</li><li>If you have lived in more than three places, attach additional pages.</li></ul><p>If there were any periods where you did not have housing, you can note that below.</p>',
        style: 'normal',
        page: 'DOJ Pardon Office',
      },
      {
        component_type: 'fieldset',
        legend: 'Street address',
        fields: [
          {
            component_type: 'text_input',
            id: 'Street addressRow1',
            label: 'Street address',
            default_value: '',
            required: false,
            page: 'DOJ Pardon Office',
          },
          {
            component_type: 'text_input',
            id: 'Apartment UnitRow1',
            label: 'Apartment /Unit',
            default_value: '',
            required: false,
            page: 'DOJ Pardon Office',
          },
          {
            component_type: 'text_input',
            id: 'City stateRow1',
            label: 'City, state',
            default_value: '',
            required: false,
            page: 'DOJ Pardon Office',
          },
          {
            component_type: 'text_input',
            id: 'Zip codeRow1',
            label: 'Zip code',
            default_value: '',
            required: false,
            page: 'DOJ Pardon Office',
          },
          {
            component_type: 'text_input',
            id: 'When did you live there monthyear to monthyearRow1',
            label: 'When did you live there? (month/year to month/year)',
            default_value: '',
            required: false,
            page: 'DOJ Pardon Office',
          },
        ],
        page: 'DOJ Pardon Office',
      },
      {
        component_type: 'fieldset',
        legend: 'Street address',
        fields: [
          {
            component_type: 'text_input',
            id: 'Street addressRow2',
            label: 'Street address',
            default_value: '',
            required: false,
            page: 'Residence History',
          },
          {
            component_type: 'text_input',
            id: 'Apartment UnitRow2',
            label: 'Apartment /Unit',
            default_value: '',
            required: false,
            page: 'Residence History',
          },
          {
            component_type: 'text_input',
            id: 'City stateRow2',
            label: 'City, state',
            default_value: '',
            required: false,
            page: 'Residence History',
          },
          {
            component_type: 'text_input',
            id: 'Zip codeRow2',
            label: 'Zip code',
            default_value: '',
            required: false,
            page: 'Residence History',
          },
          {
            component_type: 'text_input',
            id: 'When did you live there monthyear to monthyearRow2',
            label: 'When did you live there? (month/year to month/year)',
            default_value: '',
            required: false,
            page: 'Residence History',
          },
        ],
        page: 'Residence History',
      },
      {
        component_type: 'fieldset',
        legend: 'Street address',
        fields: [
          {
            component_type: 'text_input',
            id: 'Street addressRow3',
            label: 'Street address',
            default_value: '',
            required: false,
            page: 'Residence History',
          },
          {
            component_type: 'text_input',
            id: 'Apartment UnitRow3',
            label: 'Apartment /Unit',
            default_value: '',
            required: false,
            page: 'Residence History',
          },
          {
            component_type: 'text_input',
            id: 'City stateRow3',
            label: 'City, state',
            default_value: '',
            required: false,
            page: 'Residence History',
          },
          {
            component_type: 'text_input',
            id: 'Zip codeRow3',
            label: 'Zip code',
            default_value: '',
            required: false,
            page: 'Residence History',
          },
          {
            component_type: 'text_input',
            id: 'When did you live there monthyear to monthyearRow3',
            label: 'When did you live there? (month/year to month/year)',
            default_value: '',
            required: false,
            page: 'Residence History',
          },
        ],
        page: 'Residence History',
      },
      {
        component_type: 'fieldset',
        legend:
          'If you are now experiencing homelessness or have in the past, note the dates.',
        fields: [
          {
            component_type: 'text_input',
            id: 'monthyear to monthyear',
            label: '(month/year to month/year)',
            default_value: '',
            required: false,
            page: 'Residence History',
          },
        ],
        page: 'Residence History',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Military Service</h2><p>If you have completed any military service, provide details here.</p>',
        style: 'normal',
        page: 'Military Details',
      },
      {
        component_type: 'checkbox',
        id: 'Not applicable',
        label: 'Not applicable',
        default_checked: false,
        page: 'Military Details',
      },
      {
        component_type: 'fieldset',
        legend: 'Dates of service',
        fields: [
          {
            component_type: 'text_input',
            id: 'Dates of service',
            label: 'Dates of service',
            default_value: '',
            required: false,
            page: 'Military Details',
          },
          {
            component_type: 'text_input',
            id: 'Branches',
            label: 'Branch(es)',
            default_value: '',
            required: false,
            page: 'Military Details',
          },
          {
            component_type: 'text_input',
            id: 'Serial number',
            label: 'Serial number',
            default_value: '',
            required: false,
            page: 'Military Details',
          },
          {
            component_type: 'text_input',
            id: 'Type of discharge',
            label: 'Type of discharge',
            default_value: '',
            required: false,
            page: 'Military Details',
          },
        ],
        page: 'Military Details',
      },
      {
        component_type: 'fieldset',
        legend: 'Tell us briefly about your military service.',
        fields: [
          {
            component_type: 'text_input',
            id: 'space to tell us briefly about your military service',
            label: 'Tell us briefly about your military service.',
            default_value: '',
            required: false,
            page: 'Military Service Notes',
          },
        ],
        page: 'Military Service Notes',
      },
      {
        component_type: 'rich_text',
        text: '<p>For example, any tours of duty, time overseas or in active combat, disciplinary sanctions or military criminal proceedings taken against you, commendations or medals awarded to you, or other notable achievements. If available, attach a copy of your DD-214.</p>',
        style: 'normal',
        page: 'Military Service Notes',
      },
      {
        component_type: 'checkbox',
        id: 'Check here if you are attaching additional pages for your response to any questions in this section_5',
        label:
          'Check here if you are attaching additional pages for your response to any questions in this section.',
        default_checked: false,
        page: 'Military Service Notes',
      },
      {
        component_type: 'rich_text',
        text: '<i>Add the name of the form section to the top of each page you attach.</i><i>Page 11 of 24</i>',
        style: 'normal',
        page: 'Military Service Notes',
      },
      {
        component_type: 'rich_text',
        text: '<i>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</i><h2>Job History</h2><p>Tell us where you have worked in the last seven years.</p><ul><li>Include full and part-time jobs</li></ul><ul><li>If applicable, include jobs while incarcerated</li></ul><ul><li>Use approximate dates</li></ul><ul><li>Do not leave any gaps in dates</li></ul><ul><li>If you have had more than three jobs, attach additional pages</li></ul><ul><li>If you are retired, give the approximate date your retirement began in the “Current employer” section</li></ul>',
        style: 'normal',
        page: 'DOJ Header',
      },
      {
        component_type: 'fieldset',
        legend: 'Current employer',
        fields: [
          {
            component_type: 'text_input',
            id: 'Current employer',
            label: 'Current employer',
            default_value: '',
            required: false,
            page: 'DOJ Header',
          },
          {
            component_type: 'text_input',
            id: 'Type of business',
            label: 'Type of business',
            default_value: '',
            required: false,
            page: 'DOJ Header',
          },
          {
            component_type: 'text_input',
            id: 'Position',
            label: 'Position',
            default_value: '',
            required: false,
            page: 'DOJ Header',
          },
          {
            component_type: 'text_input',
            id: 'Monthyear started',
            label: 'Month/year started',
            default_value: '',
            required: false,
            page: 'DOJ Header',
          },
          {
            component_type: 'text_input',
            id: 'Employer street address',
            label: 'Employer street address',
            default_value: '',
            required: false,
            page: 'DOJ Header',
          },
          {
            component_type: 'text_input',
            id: 'City state 2',
            label: 'City, state',
            default_value: '',
            required: false,
            page: 'DOJ Header',
          },
          {
            component_type: 'text_input',
            id: 'Zip code_2',
            label: 'Zip code',
            default_value: '',
            required: false,
            page: 'DOJ Header',
          },
          {
            component_type: 'text_input',
            id: 'Supervisor name and phone',
            label: 'Supervisor name and phone number',
            default_value: '',
            required: false,
            page: 'DOJ Header',
          },
        ],
        page: 'DOJ Header',
      },
      {
        component_type: 'rich_text',
        text: '<h3>Previous Employment Details</h3>',
        style: 'normal',
        page: 'Employment History',
      },
      {
        component_type: 'fieldset',
        legend: 'Previous employer name',
        fields: [
          {
            component_type: 'text_input',
            id: 'Previous employer nameRow1',
            label: 'Previous employer name',
            default_value: '',
            required: false,
            page: 'Employment History',
          },
          {
            component_type: 'text_input',
            id: 'Type of businessRow1',
            label: 'Type of business',
            default_value: '',
            required: false,
            page: 'Employment History',
          },
          {
            component_type: 'text_input',
            id: 'PositionRow1',
            label: 'Position',
            default_value: '',
            required: false,
            page: 'Employment History',
          },
          {
            component_type: 'text_input',
            id: 'Employer address and phone numberRow1',
            label: 'Employer address and phone number',
            default_value: '',
            required: false,
            page: 'Employment History',
          },
          {
            component_type: 'text_input',
            id: 'Approximate dates worked monthyear to monthyearRow1',
            label: 'Approximate dates worked (month/year to month/year)',
            default_value: '',
            required: false,
            page: 'Employment History',
          },
        ],
        page: 'Employment History',
      },
      {
        component_type: 'fieldset',
        legend: 'Previous employer name',
        fields: [
          {
            component_type: 'text_input',
            id: 'Previous employer nameRow2',
            label: 'Previous employer name',
            default_value: '',
            required: false,
            page: 'Employment History',
          },
          {
            component_type: 'text_input',
            id: 'Type of businessRow2',
            label: 'Type of business',
            default_value: '',
            required: false,
            page: 'Employment History',
          },
          {
            component_type: 'text_input',
            id: 'PositionRow2',
            label: 'Position',
            default_value: '',
            required: false,
            page: 'Employment History',
          },
          {
            component_type: 'text_input',
            id: 'Employer address and phone numberRow2',
            label: 'Employer address and phone number',
            default_value: '',
            required: false,
            page: 'Employment History',
          },
          {
            component_type: 'text_input',
            id: 'Approximate dates worked monthyear to monthyearRow2',
            label: 'Approximate dates worked (month/year to month/year)',
            default_value: '',
            required: false,
            page: 'Employment History',
          },
        ],
        page: 'Employment History',
      },
      {
        component_type: 'rich_text',
        text: '<h3>Additional Employment and Unemployment Details</h3>',
        style: 'normal',
        page: 'Employment Gaps',
      },
      {
        component_type: 'fieldset',
        legend: 'Previous employer name',
        fields: [
          {
            component_type: 'text_input',
            id: 'Previous employer nameRow3',
            label: 'Previous employer name',
            default_value: '',
            required: false,
            page: 'Employment Gaps',
          },
          {
            component_type: 'text_input',
            id: 'Type of businessRow3',
            label: 'Type of business',
            default_value: '',
            required: false,
            page: 'Employment Gaps',
          },
          {
            component_type: 'text_input',
            id: 'PositionRow3',
            label: 'Position',
            default_value: '',
            required: false,
            page: 'Employment Gaps',
          },
          {
            component_type: 'text_input',
            id: 'Employer address and phone numberRow3',
            label: 'Employer address and phone number',
            default_value: '',
            required: false,
            page: 'Employment Gaps',
          },
          {
            component_type: 'text_input',
            id: 'Approximate dates worked monthyear to monthyearRow3',
            label: 'Approximate dates worked (month/year to month/year)',
            default_value: '',
            required: false,
            page: 'Employment Gaps',
          },
        ],
        page: 'Employment Gaps',
      },
      {
        component_type: 'fieldset',
        legend: 'Unemployment details',
        fields: [
          {
            component_type: 'text_input',
            id: 'Information on how you supported yourself while unemployed',
            label:
              'If you are currently unemployed or have been in the past, provide the dates and let us know how you supported yourself during that time',
            default_value: '',
            required: false,
            page: 'Employment Gaps',
          },
        ],
        page: 'Employment Gaps',
      },
      {
        component_type: 'fieldset',
        legend: 'Criminal record impact',
        fields: [
          {
            component_type: 'text_input',
            id: 'Details about how your criminal record has affected your ability to find word, if any',
            label:
              'If your criminal record has affected your ability to find work, provide details here',
            default_value: '',
            required: false,
            page: 'Work Challenges',
          },
        ],
        page: 'Work Challenges',
      },
      {
        component_type: 'fieldset',
        legend: 'Work history issues',
        fields: [
          {
            component_type: 'text_input',
            id: 'Details about work history',
            label:
              'If you have been fired, accused of misconduct at a job, or given an unsatisfactory job performance rating, provide details here',
            default_value: '',
            required: false,
            page: 'Work Challenges',
          },
        ],
        page: 'Work Challenges',
      },
      {
        component_type: 'checkbox',
        id: 'Check here if you are attaching additional pages for your response to any questions in this section_6',
        label:
          'Check here if you are attaching additional pages for your response to any questions in this section',
        default_checked: false,
        page: 'Work Challenges',
      },
      {
        component_type: 'rich_text',
        text: '<i>Add the name of the form section to the top of each page you attach.</i><i>Page 12 of 24</i>',
        style: 'normal',
        page: 'Work Challenges',
      },
      {
        component_type: 'rich_text',
        text: '<p>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</p>',
        style: 'normal',
        page: 'DOJ Pardon Office+',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Sobriety and Substance Use</h2><p>If you have struggled with substance use, provide details here.</p>',
        style: 'normal',
        page: 'Substance Use Overview',
      },
      {
        component_type: 'checkbox',
        id: 'Not applicable_2',
        label: 'Not applicable',
        default_checked: false,
        page: 'Substance Use Overview',
      },
      {
        component_type: 'rich_text',
        text: '<p>We recognize that many people have struggled with substance use and that this can be difficult to discuss. Your honest reflection on this topic is helpful to us. Give approximate dates, to the best of your ability.</p>',
        style: 'normal',
        page: 'Substance Use Overview',
      },
      {
        component_type: 'fieldset',
        legend: 'Substance Use Details',
        fields: [
          {
            component_type: 'text_input',
            id: 'Type of drug or alcoholRow1',
            label: 'Type of drug or alcohol',
            default_value: '',
            required: false,
            page: 'Substance Use Overview',
          },
          {
            component_type: 'text_input',
            id: 'How often were you usingRow1',
            label: 'How often were you using?',
            default_value: '',
            required: false,
            page: 'Substance Use Overview',
          },
          {
            component_type: 'text_input',
            id: 'Approximate dates used monthyear to monthyearRow1',
            label: 'Approximate dates used (month/year to month/year)',
            default_value: '',
            required: false,
            page: 'Substance Use Overview',
          },
        ],
        page: 'Substance Use Overview',
      },
      {
        component_type: 'rich_text',
        text: '<p>Provide additional details about your substance use history.</p>',
        style: 'normal',
        page: 'Substance Use Details',
      },
      {
        component_type: 'fieldset',
        legend: 'Substance Use Details',
        fields: [
          {
            component_type: 'text_input',
            id: 'Type of drug or alcoholRow2',
            label: 'Type of drug or alcohol',
            default_value: '',
            required: false,
            page: 'Substance Use Details',
          },
          {
            component_type: 'text_input',
            id: 'How often were you usingRow2',
            label: 'How often were you using?',
            default_value: '',
            required: false,
            page: 'Substance Use Details',
          },
          {
            component_type: 'text_input',
            id: 'Approximate dates used monthyear to monthyearRow2',
            label: 'Approximate dates used (month/year to month/year)',
            default_value: '',
            required: false,
            page: 'Substance Use Details',
          },
          {
            component_type: 'text_input',
            id: 'Type of drug or alcoholRow3',
            label: 'Type of drug or alcohol',
            default_value: '',
            required: false,
            page: 'Substance Use Details',
          },
          {
            component_type: 'text_input',
            id: 'How often were you usingRow3',
            label: 'How often were you using?',
            default_value: '',
            required: false,
            page: 'Substance Use Details',
          },
          {
            component_type: 'text_input',
            id: 'Approximate dates used monthyear to monthyearRow3',
            label: 'Approximate dates used (month/year to month/year)',
            default_value: '',
            required: false,
            page: 'Substance Use Details',
          },
        ],
        page: 'Substance Use Details',
      },
      {
        component_type: 'rich_text',
        text: '<p>Provide details about any diagnoses related to substance use.</p>',
        style: 'normal',
        page: 'Diagnosis Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Diagnosis Details',
        fields: [
          {
            component_type: 'text_input',
            id: 'Diagnosis',
            label: 'Diagnosis',
            default_value: '',
            required: false,
            page: 'Diagnosis Info',
          },
          {
            component_type: 'text_input',
            id: 'Date of diagnosis monthyear',
            label: 'Date of diagnosis (month/year)',
            default_value: '',
            required: false,
            page: 'Diagnosis Info',
          },
        ],
        page: 'Diagnosis Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Counseling or Treatment Information',
        fields: [
          {
            component_type: 'text_input',
            id: 'Facilitycounselordoctor name',
            label: 'Facility/counselor/doctor name',
            default_value: '',
            required: false,
            page: 'Diagnosis Info',
          },
          {
            component_type: 'text_input',
            id: 'When did you attend',
            label: 'When did you attend? (month/year to month/year)',
            default_value: '',
            required: false,
            page: 'Diagnosis Info',
          },
          {
            component_type: 'text_input',
            id: 'Street address_2',
            label: 'Street address',
            default_value: '',
            required: false,
            page: 'Diagnosis Info',
          },
          {
            component_type: 'text_input',
            id: 'Suite no',
            label: 'Suite no.',
            default_value: '',
            required: false,
            page: 'Diagnosis Info',
          },
        ],
        page: 'Diagnosis Info',
      },
      {
        component_type: 'rich_text',
        text: '<p>Provide additional counseling or treatment information.</p>',
        style: 'normal',
        page: 'Treatment Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Counseling or Treatment Information',
        fields: [
          {
            component_type: 'text_input',
            id: 'City state_2',
            label: 'City, state',
            default_value: '',
            required: false,
            page: 'Treatment Info',
          },
          {
            component_type: 'text_input',
            id: 'Zip code_3',
            label: 'Zip code',
            default_value: '',
            required: false,
            page: 'Treatment Info',
          },
          {
            component_type: 'text_input',
            id: 'Phone number_3',
            label: 'Phone number',
            default_value: '',
            required: false,
            page: 'Treatment Info',
          },
          {
            component_type: 'text_input',
            id: 'Email address',
            label: 'Email address',
            default_value: '',
            required: false,
            page: 'Treatment Info',
          },
        ],
        page: 'Treatment Info',
      },
      {
        component_type: 'rich_text',
        text: '<p>Provide information about your sobriety duration and any additional comments.</p>',
        style: 'normal',
        page: 'Sobriety Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Sobriety Duration',
        fields: [
          {
            component_type: 'text_input',
            id: 'Specify length of time in days months or years',
            label: 'Specify length of time in days, months, or years',
            default_value: '',
            required: false,
            page: 'Sobriety Info',
          },
        ],
        page: 'Sobriety Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Additional Information',
        fields: [
          {
            component_type: 'text_input',
            id: 'Is there anything else you would like to share about your history with sobriety and substance use 1',
            label:
              'Is there anything else you would like to share about your history with sobriety and substance use?',
            default_value: '',
            required: false,
            page: 'Sobriety Info',
          },
        ],
        page: 'Sobriety Info',
      },
      {
        component_type: 'checkbox',
        id: 'Check here if you are attaching additional pages for your response to any questions in this section_7',
        label:
          'Check here if you are attaching additional pages for your response to any questions in this section.',
        default_checked: false,
        page: 'Sobriety Info',
      },
      {
        component_type: 'rich_text',
        text: '<i>Add the name of the form section to the top of each page you attach.</i>',
        style: 'normal',
        page: 'Sobriety Info',
      },
      {
        component_type: 'rich_text',
        text: '<p>Financial Information Overview</p><p>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</p><h2>Financial Information</h2><p>Provide details of any debts that are late or in default (including child support payments) or bankruptcy filings.</p><p>We recognize that criminal convictions may affect people’s ability to get a job and may carry heavy financial penalties, making it more difficult to keep up with necessary expenses. We know this can be a difficult subject to discuss, but your honest reflection on this topic is helpful to us.</p>',
        style: 'normal',
        page: 'Financial Overview',
      },
      {
        component_type: 'rich_text',
        text: '<p>Debt Details</p><ul><li>Give approximate dates and amounts, to the best of your ability.</li></ul><ul><li>A credit report will be reviewed if a background investigation is initiated.</li></ul>',
        style: 'normal',
        page: 'Debt Information',
      },
      {
        component_type: 'fieldset',
        legend: 'Description of debt that is late or in default',
        fields: [
          {
            component_type: 'text_input',
            id: 'Description of debt that is late or in defaultRow1',
            label: 'Description of debt that is late or in default',
            default_value: '',
            required: false,
            page: 'Debt Information',
          },
          {
            component_type: 'text_input',
            id: 'Approximately how much is the debtRow1',
            label: 'Approximately how much is the debt?',
            default_value: '',
            required: false,
            page: 'Debt Information',
          },
          {
            component_type: 'text_input',
            id: 'Description of debt that is late or in defaultRow2',
            label: 'Description of debt that is late or in default',
            default_value: '',
            required: false,
            page: 'Debt Information',
          },
          {
            component_type: 'text_input',
            id: 'Approximately how much is the debtRow2',
            label: 'Approximately how much is the debt?',
            default_value: '',
            required: false,
            page: 'Debt Information',
          },
          {
            component_type: 'text_input',
            id: 'Description of debt that is late or in defaultRow3',
            label: 'Description of debt that is late or in default',
            default_value: '',
            required: false,
            page: 'Debt Information',
          },
          {
            component_type: 'text_input',
            id: 'Approximately how much is the debtRow3',
            label: 'Approximately how much is the debt?',
            default_value: '',
            required: false,
            page: 'Debt Information',
          },
        ],
        page: 'Debt Information',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Bankruptcy Information</h2>',
        style: 'normal',
        page: 'Bankruptcy Details',
      },
      {
        component_type: 'fieldset',
        legend: 'Court where bankruptcy filed',
        fields: [
          {
            component_type: 'text_input',
            id: 'Court where bankruptcy filedRow1',
            label: 'Court where bankruptcy filed',
            default_value: '',
            required: false,
            page: 'Bankruptcy Details',
          },
          {
            component_type: 'text_input',
            id: 'Approximate year bankruptcy filed and outcomeRow1',
            label: 'Approximate year bankruptcy filed and outcome',
            default_value: '',
            required: false,
            page: 'Bankruptcy Details',
          },
          {
            component_type: 'text_input',
            id: 'Approximately how much debt did you want to dischargeRow1',
            label: 'Approximately how much debt did you want to discharge?',
            default_value: '',
            required: false,
            page: 'Bankruptcy Details',
          },
          {
            component_type: 'text_input',
            id: 'Court where bankruptcy filedRow2',
            label: 'Court where bankruptcy filed',
            default_value: '',
            required: false,
            page: 'Bankruptcy Details',
          },
          {
            component_type: 'text_input',
            id: 'Approximate year bankruptcy filed and outcomeRow2',
            label: 'Approximate year bankruptcy filed and outcome',
            default_value: '',
            required: false,
            page: 'Bankruptcy Details',
          },
        ],
        page: 'Bankruptcy Details',
      },
      {
        component_type: 'fieldset',
        legend:
          'Is there anything else you would like to share about your experience with finances since your conviction?',
        fields: [
          {
            component_type: 'text_input',
            id: 'Information you would like to share about your experience with finances since your conviction',
            label:
              'Information you would like to share about your experience with finances since your conviction',
            default_value: '',
            required: false,
            page: 'Bankruptcy Details',
          },
        ],
        page: 'Bankruptcy Details',
      },
      {
        component_type: 'rich_text',
        text: '<p>This may include information on why you are unable to pay the above debts or filed for bankruptcy and any plans you have to catch up on payments for any debts that are late or in default.</p>',
        style: 'normal',
        page: 'Bankruptcy Details',
      },
      {
        component_type: 'checkbox',
        id: 'Check here if you are attaching additional pages for your response to any questions in this section_8',
        label:
          'Check here if you are attaching additional pages for your response to any questions in this section.',
        default_checked: false,
        page: 'Bankruptcy Details',
      },
      {
        component_type: 'rich_text',
        text: '<i>Add the name of the form section to the top of each page you attach.</i>',
        style: 'normal',
        page: 'Bankruptcy Details',
      },
      {
        component_type: 'rich_text',
        text: '<p>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</p><i>Page 15 of 24</i><h2>J. Case Background and Other Criminal History</h2><p>Provide basic information on the conviction for which you are seeking pardon. If you are seeking pardon for more than one conviction, attach additional pages.</p><p>It is not required, but, if available, sending a copy of the following documents with your application will help us review your case more quickly. See cover page for more information.</p><ul><li>Presentence report</li><li>Judgment</li><li>Statement of reasons</li><li>Indictment or Information</li><li>Case docket report</li></ul>',
        style: 'normal',
        page: 'DOJ Pardon Office Details',
      },
      {
        component_type: 'checkbox',
        id: 'Check here if you are attaching any of the listed documents',
        label: 'Check here if you are attaching any of the listed documents',
        default_checked: false,
        page: 'DOJ Pardon Office Details',
      },
      {
        component_type: 'radio_group',
        id: 'Did you plead guilty',
        legend: 'Did you plead guilty?',
        page: 'DOJ Pardon Office Details',
        options: [
          {
            id: 'Yes_3',
            label: 'Yes',
            name: 'Yes_3',
            default_checked: false,
            page: 'DOJ Pardon Office Details',
          },
          {
            id: 'No_3',
            label: 'No',
            name: 'No_3',
            default_checked: false,
            page: 'DOJ Pardon Office Details',
          },
        ],
      },
      {
        component_type: 'rich_text',
        text: '<h3>Conviction Details</h3>',
        style: 'normal',
        page: 'Conviction Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Approximate date(s) of offense',
        fields: [
          {
            component_type: 'text_input',
            id: 'Approximate_dates_of_offense_monthyear_to',
            label: 'Approximate date(s) of offense (month/year to month/year)',
            default_value: '',
            required: false,
            page: 'Conviction Info',
          },
        ],
        page: 'Conviction Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Approximate date you were sentenced',
        fields: [
          {
            component_type: 'text_input',
            id: 'Approximate_date_you_were_sentenced',
            label: 'Approximate date you were sentenced (month/year)',
            default_value: '',
            required: false,
            page: 'Conviction Info',
          },
        ],
        page: 'Conviction Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Court where you were prosecuted',
        fields: [
          {
            component_type: 'text_input',
            id: 'Court_where_you_were_prosecuted_DC_Superior_Court',
            label:
              'Court where you were prosecuted (D.C. Superior Court, military court, or name of U.S. District Court)',
            default_value: '',
            required: false,
            page: 'Conviction Info',
          },
        ],
        page: 'Conviction Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Case number',
        fields: [
          {
            component_type: 'text_input',
            id: 'Case number',
            label: 'Case number',
            default_value: '',
            required: false,
            page: 'Conviction Info',
          },
        ],
        page: 'Conviction Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Of what were you convicted?',
        fields: [
          {
            component_type: 'text_input',
            id: 'Of_what_were_you_convicted',
            label: 'Of what were you convicted?',
            default_value: '',
            required: false,
            page: 'Conviction Info',
          },
        ],
        page: 'Conviction Info',
      },
      {
        component_type: 'rich_text',
        text: '<h3>Sentencing Information</h3><p>What sentence did you receive? (fill in where applicable)</p>',
        style: 'normal',
        page: 'Sentencing Details',
      },
      {
        component_type: 'fieldset',
        legend: 'Imprisonment',
        fields: [
          {
            component_type: 'text_input',
            id: 'Prison sentence months or years',
            label: 'Prison sentence (months or years)',
            default_value: '',
            required: false,
            page: 'Sentencing Details',
          },
          {
            component_type: 'text_input',
            id: 'Approximate date you were released from',
            label:
              'Approximate date you were released from prison, community confinement, or home detention (month/year)',
            default_value: '',
            required: false,
            page: 'Sentencing Details',
          },
        ],
        page: 'Sentencing Details',
      },
      {
        component_type: 'fieldset',
        legend: 'Probation or supervised release',
        fields: [
          {
            component_type: 'text_input',
            id: 'Sentence for probation or supervised',
            label:
              'Sentence for probation or supervised release (months or years)',
            default_value: '',
            required: false,
            page: 'Sentencing Details',
          },
          {
            component_type: 'text_input',
            id: 'Approximate date you completed your term',
            label:
              'Approximate date you completed your term of probation or supervised release (month/year)',
            default_value: '',
            required: false,
            page: 'Sentencing Details',
          },
        ],
        page: 'Sentencing Details',
      },
      {
        component_type: 'fieldset',
        legend: 'Financial penalties',
        fields: [
          {
            component_type: 'text_input',
            id: 'Assessment amount',
            label: 'Assessment amount',
            default_value: '',
            required: false,
            page: 'Sentencing Details',
          },
          {
            component_type: 'text_input',
            id: 'Fine amount',
            label: 'Fine amount',
            default_value: '',
            required: false,
            page: 'Sentencing Details',
          },
          {
            component_type: 'text_input',
            id: 'Restitution amount',
            label: 'Restitution amount',
            default_value: '',
            required: false,
            page: 'Sentencing Details',
          },
        ],
        page: 'Sentencing Details',
      },
      {
        component_type: 'rich_text',
        text: '<i>Page 15 of 24</i>',
        style: 'normal',
        page: 'Sentencing Details',
      },
      {
        component_type: 'rich_text',
        text: '<h2>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</h2>',
        style: 'normal',
        page: 'DOJ Pardon Office 2024',
      },
      {
        component_type: 'rich_text',
        text: '<h3>Tell us about your conduct for which you were convicted.</h3><p>We want to hear from you, in your own words. The more specific and complete you are, the more helpful it is to us. We are specifically looking for information that is NOT in the public record of your case. You may wish to answer the following:</p><ul><li>What was your role in the offense?</li></ul><ul><li>How, when, and why did you get involved?</li></ul><ul><li>What actions did you take in connection with the offense? (Include all actions, even if you pleaded guilty to only specific conduct, counts, or portions of the full criminal activity.)</li></ul>',
        style: 'normal',
        page: 'Conduct Details',
      },
      {
        component_type: 'fieldset',
        legend: 'Tell us about your conduct for which you were convicted',
        fields: [
          {
            component_type: 'text_input',
            id: 'Tell us about your conduct for which you were convicted',
            label: 'Tell us about your conduct for which you were convicted',
            default_value: '',
            required: false,
            page: 'Conduct Details',
          },
        ],
        page: 'Conduct Details',
      },
      {
        component_type: 'rich_text',
        text: '<p>Do you accept responsibility for your conduct? Explain why or why not.</p>',
        style: 'normal',
        page: 'Responsibility Acceptance',
      },
      {
        component_type: 'fieldset',
        legend:
          'Explanation of why or why not you accept responsibility for your conduct',
        fields: [
          {
            component_type: 'text_input',
            id: 'Explanation of why or why not you accept responsibility for your conduct',
            label:
              'Explanation of why or why not you accept responsibility for your conduct',
            default_value: '',
            required: false,
            page: 'Responsibility Acceptance',
          },
        ],
        page: 'Responsibility Acceptance',
      },
      {
        component_type: 'checkbox',
        id: 'Check here if you are attaching additional pages for your response to any questions in this section_9',
        label:
          'Check here if you are attaching additional pages for your response to any questions in this section.',
        default_checked: false,
        page: 'Responsibility Acceptance',
      },
      {
        component_type: 'rich_text',
        text: '<i>Add the name of the form section to the top of each page you attach.</i>',
        style: 'normal',
        page: 'Responsibility Acceptance',
      },
      {
        component_type: 'rich_text',
        text: '<p>This page collects information about your criminal history, including any additional records you may have.</p><p>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</p><h2>Tell us about any other criminal history.</h2><p>Your criminal history will be reviewed as part of any background investigation. List any other arrests or convictions that may appear on your criminal history record, if any, including juvenile and expunged records, and provide any information you would like us to know about them. If you have your presentence report, you may attach it and provide missing or additional information you would like us to know below.</p>',
        style: 'normal',
        page: 'Criminal History',
      },
      {
        component_type: 'fieldset',
        legend: 'Tell us about any other criminal history',
        fields: [
          {
            component_type: 'text_input',
            id: 'Tell us about any other criminal history',
            label: 'Tell us about any other criminal history',
            default_value: '',
            required: false,
            page: 'Criminal History',
          },
        ],
        page: 'Criminal History',
      },
      {
        component_type: 'checkbox',
        id: 'Check here if you are attaching additional pages for your response to any questions in this section_10',
        label:
          'Check here if you are attaching additional pages for your response to any questions in this section.',
        default_checked: false,
        page: 'Criminal History',
      },
      {
        component_type: 'rich_text',
        text: '<i>Add the name of the form section to the top of each page you attach.</i><i>Page 17 of 24</i>',
        style: 'normal',
        page: 'Criminal History',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Certification and Personal Oath</h2><p>I certify, under penalty of perjury, that all information in my petition and any document submitted with it were provided or authorized by me and that I reviewed and understand the information contained in, and submitted with, my petition. I further certify, under penalty of perjury, that all the information I provided in the application is complete, true, and correct to the best of my knowledge, information, and belief.</p><p>In petitioning the President of the United States for pardon, I do solemnly swear that I will be law-abiding and will support and defend the Constitution of the United States against all enemies, foreign and domestic, and that I take this obligation freely and without any mental reservation whatsoever.</p><p>Respectfully submitted this day of , .</p>',
        style: 'normal',
        page: 'Certification Oath',
      },
      {
        component_type: 'fieldset',
        legend: 'Date',
        fields: [
          {
            component_type: 'text_input',
            id: 'Day',
            label: 'Day',
            default_value: '',
            required: false,
            page: 'Certification Oath',
          },
          {
            component_type: 'text_input',
            id: 'Month',
            label: 'Month',
            default_value: '',
            required: false,
            page: 'Certification Oath',
          },
          {
            component_type: 'text_input',
            id: 'Year',
            label: 'Year',
            default_value: '',
            required: false,
            page: 'Certification Oath',
          },
        ],
        page: 'Certification Oath',
      },
      {
        component_type: 'text_input',
        id: 'Your signature',
        label: 'Your signature',
        default_value: '',
        required: false,
        page: 'Certification Oath',
      },
      {
        component_type: 'rich_text',
        text: '<p>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</p><i>Page 18 of 24</i>',
        style: 'normal',
        page: 'Certification Oath',
      },
      {
        component_type: 'rich_text',
        text: '<h2>Authorization for Release of Information</h2><p>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</p><b>OMB CONTROL NUMBER: TBD EXPIRATION DATE: TBD</b><p>Paperwork Reduction Act Statement - This collection meets the requirements of 44 U.S.C. § 3507, as amended by the Paperwork Reduction Act of 1995. We estimate that it will take 5 minutes to read the instructions, gather the facts, and answer questions.</p><p>Carefully read this authorization, and if you agree, sign and date in ink.</p>',
        style: 'normal',
        page: 'Authorization Release',
      },
      {
        component_type: 'rich_text',
        text: '<h3>Authorization Details</h3><p>I authorize any investigator, special agent, or other duly accredited representative of the Federal Bureau of Investigation, the Department of Defense, and any other authorized Federal agency, to obtain any information relating to my activities from schools, residential management agents, employers, criminal justice agencies, retail business establishments, courts, or other sources of information. This information may include, but is not limited to, my academic, residential, achievement, performance, attendance, disciplinary, employment history, criminal history, arrest, conviction, including the presentence investigation report, if any, medical, psychiatric/psychological, health care, and financial and credit information.</p><p>I understand that, for financial or lending institutions and certain other sources of information, a separate specific release may be needed (pursuant to their request or as may be required by law), and I may be contacted for such a release at a later date.</p><p>I further authorize the Federal Bureau of Investigation, the Department of Defense, and any other authorized Federal agency, to request criminal record information about me from criminal justice agencies for the purpose of determining my suitability for a government benefit.</p>',
        style: 'normal',
        page: 'Authorization Details',
      },
      {
        component_type: 'rich_text',
        text: '<h3>Signature and Other Information</h3>',
        style: 'normal',
        page: 'Signature Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Signature',
        fields: [
          {
            component_type: 'text_input',
            id: 'Full Name type or print legibly',
            label: 'Full Name (type or print legibly)',
            default_value: '',
            required: false,
            page: 'Signature Info',
          },
          {
            component_type: 'text_input',
            id: 'Date Signed',
            label: 'Date Signed',
            default_value: '',
            required: false,
            page: 'Signature Info',
          },
        ],
        page: 'Signature Info',
      },
      {
        component_type: 'fieldset',
        legend: 'Other Information',
        fields: [
          {
            component_type: 'text_input',
            id: 'Other Names Used',
            label: 'Other Names Used',
            default_value: '',
            required: false,
            page: 'Signature Info',
          },
          {
            component_type: 'text_input',
            id: 'Street Address',
            label: 'Street Address',
            default_value: '',
            required: false,
            page: 'Signature Info',
          },
          {
            component_type: 'text_input',
            id: 'City',
            label: 'City',
            default_value: '',
            required: false,
            page: 'Signature Info',
          },
          {
            component_type: 'text_input',
            id: 'State',
            label: 'State',
            default_value: '',
            required: false,
            page: 'Signature Info',
          },
          {
            component_type: 'text_input',
            id: 'ZIP Code',
            label: 'ZIP Code',
            default_value: '',
            required: false,
            page: 'Signature Info',
          },
          {
            component_type: 'text_input',
            id: 'Home Telephone Number include area code',
            label: 'Home Telephone Number (include area code)',
            default_value: '',
            required: false,
            page: 'Signature Info',
          },
          {
            component_type: 'text_input',
            id: 'Social Security Number',
            label: 'Social Security Number',
            default_value: '',
            required: false,
            page: 'Signature Info',
          },
        ],
        page: 'Signature Info',
      },
      {
        component_type: 'rich_text',
        text: '<i>Page 19 of 24</i>',
        style: 'normal',
        page: 'Signature Info',
      },
      {
        component_type: 'rich_text',
        text: '<p>This page contains the header and introductory information for the Letter of Support.</p><p>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</p><h2>Letter of Support</h2>',
        style: 'normal',
        page: 'Support Intro',
      },
      {
        component_type: 'checkbox',
        id: 'Primary reference select exactly 3',
        label: 'Primary reference (select exactly 3)',
        default_checked: false,
        page: 'Support Intro',
      },
      {
        component_type: 'rich_text',
        text: '<p>This page includes information about the petitioner and your relationship with them.</p>',
        style: 'normal',
        page: 'Petitioner Info',
      },
      {
        component_type: 'fieldset',
        legend: 'On behalf of',
        fields: [
          {
            component_type: 'text_input',
            id: 'Name_of_petitioner',
            label: 'Name of petitioner',
            default_value: '',
            required: false,
            page: 'Petitioner Info',
          },
        ],
        page: 'Petitioner Info',
      },
      {
        component_type: 'rich_text',
        text: '<p>I certify that I have personally known the petitioner for years and am not related to petitioner by blood or marriage.</p>',
        style: 'normal',
        page: 'Petitioner Info',
      },
      {
        component_type: 'fieldset',
        legend: 'I certify that I have personally known the petitioner for',
        fields: [
          {
            component_type: 'text_input',
            id: 'Number_of_years_have_known_petitioner',
            label: 'Number of years have known petitioner',
            default_value: '',
            required: false,
            page: 'Petitioner Info',
          },
        ],
        page: 'Petitioner Info',
      },
      {
        component_type: 'rich_text',
        text: '<p>This page contains your statement in support of the pardon petition.</p><p>In support of this pardon petition, I state the below:</p>',
        style: 'normal',
        page: 'Support Statement',
      },
      {
        component_type: 'fieldset',
        legend: 'Statement in support of the pardon petition',
        fields: [
          {
            component_type: 'text_input',
            id: 'Statement_in_support_of_the_pardon_petition',
            label: 'Statement in support of the pardon petition',
            default_value: '',
            required: false,
            page: 'Support Statement',
          },
        ],
        page: 'Support Statement',
      },
      {
        component_type: 'rich_text',
        text: '<b>NOTE: The information below should be based on your personal knowledge of the petitioner. Helpful information includes:</b><ul><li>How you know the individual,</li><li>What you know of the person’s reputation and conduct since their conviction, and</li><li>Their personal and professional activities, including at work, at home, and in the community.</li></ul>',
        style: 'normal',
        page: 'Support Statement',
      },
      {
        component_type: 'checkbox',
        id: 'Check_here_if_you_are_attaching_additional_pages',
        label: 'Check here if you are attaching additional pages.',
        default_checked: false,
        page: 'Support Statement',
      },
      {
        component_type: 'rich_text',
        text: '<p>This page includes the affirmation of the information provided and your signature.</p><p>I affirm that the above information is true and correct to the best of my knowledge, information, and belief.</p>',
        style: 'normal',
        page: 'Affirmation & Signature',
      },
      {
        component_type: 'fieldset',
        legend: 'Signature',
        fields: [
          {
            component_type: 'text_input',
            id: 'Signature_2',
            label: 'Signature',
            default_value: '',
            required: false,
            page: 'Affirmation & Signature',
          },
          {
            component_type: 'text_input',
            id: 'Print Name_2',
            label: 'Print Name',
            default_value: '',
            required: false,
            page: 'Affirmation & Signature',
          },
          {
            component_type: 'text_input',
            id: 'Date_2',
            label: 'Date',
            default_value: '',
            required: false,
            page: 'Affirmation & Signature',
          },
        ],
        page: 'Affirmation & Signature',
      },
      {
        component_type: 'rich_text',
        text: '<i>Page 20 of 24</i>',
        style: 'normal',
        page: 'Affirmation & Signature',
      },
      {
        component_type: 'rich_text',
        text: '<p>This page contains the header and introductory information for the Letter of Support.</p><p>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</p><h2>Letter of Support</h2>',
        style: 'normal',
        page: 'Support Intro+',
      },
      {
        component_type: 'checkbox',
        id: 'Primary reference select exactly 3_2',
        label: 'Primary reference (select exactly 3)',
        default_checked: false,
        page: 'Support Intro+',
      },
      {
        component_type: 'rich_text',
        text: '<p>This page includes information about the petitioner and your relationship with them.</p>',
        style: 'normal',
        page: 'Petitioner Relationship',
      },
      {
        component_type: 'fieldset',
        legend: 'on behalf of',
        fields: [
          {
            component_type: 'text_input',
            id: 'Name of petitioner_2',
            label: 'Name of petitioner',
            default_value: '',
            required: false,
            page: 'Petitioner Relationship',
          },
        ],
        page: 'Petitioner Relationship',
      },
      {
        component_type: 'rich_text',
        text: '<p>I certify that I have personally known the petitioner for years and am not related to petitioner by blood or marriage.</p>',
        style: 'normal',
        page: 'Petitioner Relationship',
      },
      {
        component_type: 'fieldset',
        legend: 'I certify that I have personally known the petitioner for',
        fields: [
          {
            component_type: 'text_input',
            id: 'Number of year you have known petitioner_2',
            label: 'years',
            default_value: '',
            required: false,
            page: 'Petitioner Relationship',
          },
        ],
        page: 'Petitioner Relationship',
      },
      {
        component_type: 'rich_text',
        text: '<p>This page provides guidance on what to include in your statement of support.</p><p>In support of this pardon petition, I state the below:</p><i>NOTE: The information below should be based on your personal knowledge of the petitioner. Helpful information includes:</i><ul><li>How you know the individual,</li><li>What you know of the person’s reputation and conduct since their conviction, and</li><li>Their personal and professional activities, including at work, at home, and in the community.</li></ul>',
        style: 'normal',
        page: 'Support Guidance+',
      },
      {
        component_type: 'checkbox',
        id: 'Check_here_if_you_are_attaching_additional_pages_2',
        label: 'Check here if you are attaching additional pages.',
        default_checked: false,
        page: 'Support Guidance+',
      },
      {
        component_type: 'rich_text',
        text: '<p>This page includes the affirmation of the information provided and fields for signature and contact details.</p><p>I affirm that the above information is true and correct to the best of my knowledge, information, and belief.</p>',
        style: 'normal',
        page: 'Affirmation Signature+',
      },
      {
        component_type: 'fieldset',
        legend: 'Signature',
        fields: [
          {
            component_type: 'text_input',
            id: 'Signature_3',
            label: 'Signature',
            default_value: '',
            required: false,
            page: 'Affirmation Signature+',
          },
          {
            component_type: 'text_input',
            id: 'Print Name_3',
            label: 'Print Name',
            default_value: '',
            required: false,
            page: 'Affirmation Signature+',
          },
          {
            component_type: 'text_input',
            id: 'Date_3',
            label: 'Date',
            default_value: '',
            required: false,
            page: 'Affirmation Signature+',
          },
        ],
        page: 'Affirmation Signature+',
      },
      {
        component_type: 'rich_text',
        text: '<p>This page includes contact information fields.</p>',
        style: 'normal',
        page: 'Contact Information',
      },
      {
        component_type: 'fieldset',
        legend: 'Contact Information',
        fields: [
          {
            component_type: 'text_input',
            id: 'Address_2',
            label: 'Address',
            default_value: '',
            required: false,
            page: 'Contact Information',
          },
          {
            component_type: 'text_input',
            id: 'Phone_number_5',
            label: 'Phone number',
            default_value: '',
            required: false,
            page: 'Contact Information',
          },
          {
            component_type: 'text_input',
            id: 'Email_address_3',
            label: 'Email address',
            default_value: '',
            required: false,
            page: 'Contact Information',
          },
        ],
        page: 'Contact Information',
      },
      {
        component_type: 'rich_text',
        text: '<i>Page 21 of 24</i>',
        style: 'normal',
        page: 'Contact Information',
      },
      {
        component_type: 'rich_text',
        text: '<p>This page contains information about the United States Department of Justice and a letter of support for a pardon petition.</p><p>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</p><h2>Letter of Support</h2>',
        style: 'normal',
        page: 'DOJ Support Letter',
      },
      {
        component_type: 'checkbox',
        id: 'Primary reference select exactly 3_3',
        label: 'Primary reference (select exactly 3)',
        default_checked: false,
        page: 'DOJ Support Letter',
      },
      {
        component_type: 'fieldset',
        legend: 'on behalf of',
        fields: [
          {
            component_type: 'text_input',
            id: 'Name of petitioner_3',
            label: 'Name of petitioner',
            default_value: '',
            required: false,
            page: 'DOJ Support Letter',
          },
        ],
        page: 'DOJ Support Letter',
      },
      {
        component_type: 'rich_text',
        text: '<p>This page includes certification of personal knowledge of the petitioner and a statement in support of the pardon petition.</p><p>I certify that I have personally known the petitioner for years and am not related to petitioner by blood or marriage.</p>',
        style: 'normal',
        page: 'DOJ Support Letter',
      },
      {
        component_type: 'fieldset',
        legend: 'I certify that I have personally known the petitioner for',
        fields: [
          {
            component_type: 'text_input',
            id: 'Number of years you have known petitioner_3',
            label: 'Number of years you have known petitioner',
            default_value: '',
            required: false,
            page: 'DOJ Support Letter',
          },
        ],
        page: 'DOJ Support Letter',
      },
      {
        component_type: 'rich_text',
        text: '<p>This page includes the statement in support and additional information about the petitioner.</p>',
        style: 'normal',
        page: 'Support Statement Details',
      },
      {
        component_type: 'fieldset',
        legend: 'Statement in support of the pardon petition',
        fields: [
          {
            component_type: 'text_input',
            id: 'Statement in support of pardon petition_2',
            label: 'Statement in support of pardon petition',
            default_value: '',
            required: false,
            page: 'Support Statement Details',
          },
        ],
        page: 'Support Statement Details',
      },
      {
        component_type: 'rich_text',
        text: '<i>NOTE: The information below should be based on your personal knowledge of the petitioner. Helpful information includes:</i><ul><li>How you know the individual,</li><li>What you know of the person’s reputation and conduct since their conviction, and</li><li>Their personal and professional activities, including at work, at home, and in the community.</li></ul>',
        style: 'normal',
        page: 'Support Statement Details',
      },
      {
        component_type: 'checkbox',
        id: 'Check here if you are attaching additional pages',
        label: 'Check here if you are attaching additional pages.',
        default_checked: false,
        page: 'Support Statement Details',
      },
      {
        component_type: 'rich_text',
        text: '<p>This page includes the affirmation of the information provided and fields for signature and contact details.</p><p>I affirm that the above information is true and correct to the best of my knowledge, information, and belief.</p>',
        style: 'normal',
        page: 'Affirmation & Contact',
      },
      {
        component_type: 'fieldset',
        legend: 'Signature and Contact Information',
        fields: [
          {
            component_type: 'text_input',
            id: 'Signature_3',
            label: 'Signature',
            default_value: '',
            required: false,
            page: 'Affirmation & Contact',
          },
          {
            component_type: 'text_input',
            id: 'Print Name_3',
            label: 'Print Name',
            default_value: '',
            required: false,
            page: 'Affirmation & Contact',
          },
          {
            component_type: 'text_input',
            id: 'Date_3',
            label: 'Date',
            default_value: '',
            required: false,
            page: 'Affirmation & Contact',
          },
          {
            component_type: 'text_input',
            id: 'Address_3',
            label: 'Address',
            default_value: '',
            required: false,
            page: 'Affirmation & Contact',
          },
          {
            component_type: 'text_input',
            id: 'Phone number_6',
            label: 'Phone number',
            default_value: '',
            required: false,
            page: 'Affirmation & Contact',
          },
          {
            component_type: 'text_input',
            id: 'Email address_4',
            label: 'Email address',
            default_value: '',
            required: false,
            page: 'Affirmation & Contact',
          },
        ],
        page: 'Affirmation & Contact',
      },
      {
        component_type: 'rich_text',
        text: '<i>Page 22 of 24</i>',
        style: 'normal',
        page: 'Affirmation & Contact',
      },
      {
        component_type: 'rich_text',
        text: '<p>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</p><i>Page 23 of 24</i><h2>Application Checklist</h2><h3>1. Gather the following information.</h3>',
        style: 'normal',
        page: 'DOJ Pardon March Details',
      },
      {
        component_type: 'fieldset',
        legend: 'Required',
        fields: [
          {
            component_type: 'checkbox',
            id: 'Application_form_pages_617',
            label: 'Application form (pages 6-17)',
            default_checked: false,
            page: 'DOJ Pardon March Details',
          },
          {
            component_type: 'checkbox',
            id: 'Signed_certification_and_personal_oath',
            label: 'Signed certification and personal oath (page 18)',
            default_checked: false,
            page: 'DOJ Pardon March Details',
          },
          {
            component_type: 'checkbox',
            id: 'Signed_and_completed_Authorization_for',
            label:
              'Signed and completed Authorization for Release of Information form (page 19)',
            default_checked: false,
            page: 'DOJ Pardon March Details',
          },
          {
            component_type: 'checkbox',
            id: '3_signed_letters_of_support_from_nonrelatives',
            label:
              '3 signed letters of support from non-relatives (pages 20-22)',
            default_checked: false,
            page: 'DOJ Pardon March Details',
          },
        ],
        page: 'DOJ Pardon March Details',
      },
      {
        component_type: 'rich_text',
        text: '<i>Note: You MUST select exactly 3 as your primary letters.</i>',
        style: 'normal',
        page: 'DOJ Pardon March Details',
      },
      {
        component_type: 'rich_text',
        text: '<h3>Optional Documents</h3>',
        style: 'normal',
        page: 'Optional Docs',
      },
      {
        component_type: 'fieldset',
        legend: 'Optional',
        fields: [
          {
            component_type: 'checkbox',
            id: 'Official_records_presentence_report_judgment',
            label:
              'Official records: presentence report, judgment, statement of reasons, indictment or information, or court docket record',
            default_checked: false,
            page: 'Optional Docs',
          },
          {
            component_type: 'checkbox',
            id: 'Personal_records_supporting_answers',
            label: 'Personal records supporting answers',
            default_checked: false,
            page: 'Optional Docs',
          },
          {
            component_type: 'checkbox',
            id: 'Additional_pages_to_complete_answers',
            label: 'Additional pages to complete answers',
            default_checked: false,
            page: 'Optional Docs',
          },
          {
            component_type: 'checkbox',
            id: 'Additional_pages_with_any_information_you_feel',
            label:
              'Additional pages with any information you feel would make your application stronger but did not see a space to talk about it.',
            default_checked: false,
            page: 'Optional Docs',
          },
        ],
        page: 'Optional Docs',
      },
      {
        component_type: 'rich_text',
        text: '<h3>Submission Instructions</h3><h3>2. Submit your application.</h3><i>NOTE: Keep a copy of everything you submit for your personal records.</i><b>For general pardon applications</b><p>The fastest way to submit your application is by email. If you send it by mail, it may take longer to process.</p><b>By email</b><p>Email documents in PDF or Word format to USPardon.Attorney@usdoj.gov</p><b>By mail</b><p>U.S. Dep’t of Justice, Office of the Pardon Attorney 950 Pennsylvania Avenue, N.W. Washington, D.C. 20530</p>',
        style: 'normal',
        page: 'Submission Guide',
      },
      {
        component_type: 'rich_text',
        text: '<h3>Military Pardon Instructions</h3><b>For pardon of a general court-martial conviction only</b><p>Submit your application to the Secretary of the military department that had original jurisdiction in your case:</p><p>U.S. Army: Secretary of the Army Department of the Army ATTN: OTJAG-CLD Pentagon Washington, DC 20310</p><p>U.S. Navy/U.S. Marine Corps: Office of the Judge Advocate General Criminal Law Division (Code 20) 1254 Charles Morris Street S.E. Suite B01 Washington Navy Yard, D.C. 20374</p><p>U.S. Air Force: Secretary of the Air Force Attention: AFLOA/JAJR 1500 W. Perimeter Road Suite 1170 Joint Base Andrews, Naval Air Facility, MD 20762</p><i>NOTE: Pardon of a military offense will not change the character of a military discharge.</i>',
        style: 'normal',
        page: 'Military Pardon Guide',
      },
      {
        component_type: 'rich_text',
        text: '<p>United States Department of Justice, Office of the Pardon Attorney, Washington D.C. / March 2024</p><p>Keep your contact information up-to-date. If your contact information changes, email us at USPardon.Attorney@usdoj.gov or send a letter to our mailing address so that we can reach you throughout the pardon application process.</p>',
        style: 'normal',
        page: 'DOJ Pardon 2024',
      },
      {
        component_type: 'rich_text',
        text: '<h3>The application process:</h3><ol><li>Confirmation letter – We will send an email or letter letting you know we received your application and if it is missing any parts. If you have not received a confirmation after three months, email USPardon.Attorney@usdoj.gov (preferred) or send a letter to our mailing address. You may also check the status of your case on the Pardon Attorney’s website, at: https://www.justice.gov/pardon/search-clemency-case-status.</li><li>Follow-up letters – It may take some time for review of your application to start. During the review, we may need more information or updates to your application. If we do, we will contact you by email (preferred) or mail.</li><li>Background investigation – During the review of your application, a background investigation may be necessary. The investigation is conducted by agents of the Federal Bureau of Investigation (FBI). We will let you know by email (preferred) or mail if we have requested a background investigation. It may include interviews of you, the people who wrote your letters of support, neighbors, former and present employers, acquaintances, and other individuals who may be able to provide relevant information about you. The agent will be discreet and make reasonable efforts not to disclose the reason for the investigation, but we cannot guarantee that those interviewed will not learn that you are seeking pardon for a past criminal conviction.</li></ol>',
        style: 'normal',
        page: 'Application Steps',
      },
      {
        component_type: 'rich_text',
        text: '<ol start="4"><li>Notification of final decision – You will be notified when a final decision is made by the President on whether to grant or deny your pardon application. This may take years. No hearing will be held and there is no appeal from the President’s decision to deny a request for pardon.</li><li>Reapply – If your pardon request is denied, you may reapply two years after the date of the denial.</li></ol>',
        style: 'normal',
        page: 'Decision Notification',
      },
    ],
    raw_fields: {},
    grouped_items: [],
    raw_fields_pages: {},
  },
  cache_id: '1816283a0263e8dc92af748aa15b3d273f4f1d24d3d4a61a46116de0d0e7d29d',
};
