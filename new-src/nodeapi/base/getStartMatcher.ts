function no_getStartMatcher(start: string) {
  if (!start)
    return (str: string) => true;

  return (str: string) => {
  };
}