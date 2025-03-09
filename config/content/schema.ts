interface ContentSchema {
  login: {
    loginTitle: string;
    loginDescription: string;
    aboutTitle: string;
    aboutDescription1: string;
    aboutDescription2: string;
    forgotText: string;
    loginButton: string;
    registerText: string;
    registerButton: string;
    errorText: string;
  };
  fileACase: {
    title: string;
    select: string;
    link: string;
    description: string;
    arbitration: {
      title: string;
      description: string;
    };
    mediation: {
      title: string;
      description: string;
    };
  };
  arbitrationType: {
    title: string;
    description: string;
    back: string;
    checkboxArb: string;
    title2: string;
    title3: string;
    descriptionFastrack: string;
    descriptionFastrackList1: string;
    descriptionFastrackList2: string;
    descriptionEmergency: string;
    descriptionEmergencyList1: string;
    descriptionEmergencyList2: string;
    descriptionEmergencyList3: string;
    next: string;
  };
  landingPage: {
    welcomeText: string;
    describtion: string;
    fileaCase: string;
    descriptionOne: string;
    membership: string;
    becomeAmember: string;
    drafttitle: string;
    draftdescription: string;
    viewDetails: string;
    empty: string;
  };
  stepper: {
    next: string;
    draft: string;
    title: string;
    titleEmergency:string;
    back: string;
    stepsDesc: string;
    stepsEmergencyDesc:string;
    stepsFor: string;
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    step5: string;
    step6: string;
    step7: string;
    step8: string;
    step9: string;
    step10: string;
    step11: string;
    step12: string;
    step13: string;
  };
  navbar: {
    title1: string;
    title2: string;
    title3: string;
    dropdownContent1: string;
    dropdownContent2: string;
  };
  footer: {
    titleHeader: string;
    titleItem1: string;
    titleItem2: string;
  };
  signup: {
    header: string;
    subHeader: string;
    fullName: string;
    Address: string;
    Nationality: string;
    Country: string;
    EmailID: string;
    PhoneNumber: string;
    EnterPassword: string;
    ReEnterPassword: string;
    passCriteria1: string;
    passCriteria2: string;
    passCriteria3: string;
    passCriteria4: string;
    checkbox: string;
    signUp: string;
    accountTitle: string;
    loginBtn: string;
  };
  disputeDetails: {
    title: string;
    description: string;
    clickHere: string;
    label1: string;
    label2: string;
    label3: string;
    label4: string;
    label5: string;
    label6: string;
    label7: string;
    label8: string;
  };
  arbAgrement: {
    title: string;
    description: string;
    label1: string;
    label2: string;
    label3: string;
    label4: string;
    label5: string;
    label6: string;
    label7: string;
    label8: string;
    label9: string;
    label10: string;
    label11: string;
    label12: string;
    label13: string;
    label14: string;
    label15: string;
    label16: string;
    label17: string;
    draft: string;
    next: string;
  };
  arbSettings: {
    title: string;
    description: string;
    label1: string;
    label2: string;
    label3: string;
    label4: string;
    label5: string;
    label6: string;
    label7: string;
    label8: string;
    label9: string;
    label10: string;
    label11: string;
    label12: string;
    label13: string;
    label14: string;
    draft: string;
    next: string;
  };
  Consolidation: {
    title: string;
    description: string;
    label1: string;
    label2: string;
    label3: string;
    label4: string;
    label5: string;
    label6: string;
    label7: string;
    label8: string;
    label9: string;
    label10: string;
    label11: string;
    draft: string;
    next: string;
  };
  docUpload: {
    recommend: string;
    addMore: string;
    promt: string;
    browse: string;
    clickBrowse: string;
    document: string;
  };
  reliefDetails: {
    title: string;
    description: string;
    totalFee: string;
    grounds: string;
    nature: string;
    reasons: string;
    doc: string;
    explanation: string;
  };
  supportDocs: {
    title: string;
    description: string;
    docTitle: string;
  };
}

export default ContentSchema;
