const relationshipLabels = {
    father: 'Father',
    spouse: 'Spouse',
    mother: 'Mother',
    son: 'Son',
    daughter: 'Daughter',
    brother: 'Brother',
    sister: 'Sister',
    child: 'Son or daughter',
    sibling: 'Brother or sister',
    grandfather: 'Grandfather',
    grandmother: 'Grandmother',
    grandson: 'Grandson',
    granddaughter: 'Granddaughter',
    uncle: 'Uncle',
    aunt: 'Aunt',
    cousin: 'Cousin',
    legal_guardian: 'Legal guardian',
    caregiver: 'Caregiver',
    friend: 'Friend',
    neighbor: 'Neighbor',
    other: 'Other',
};

export function getGuardianRelationshipLabel(relationship, customRelationship = '', configuredOptions = []) {
    const configuredOption = configuredOptions.find((option) => option.value === relationship);
    if (configuredOption) {
        return configuredOption.label;
    }

    if (relationship === 'custom') {
        return customRelationship.trim() || 'Other';
    }

    return relationshipLabels[relationship] || '';
}
